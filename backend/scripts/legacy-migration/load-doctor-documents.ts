/**
 * Re-route migrated patient documents into the DOCTOR-visible tables so they
 * show in the doctor portal (consultation history + appointment workspace):
 *   - generatedBySystem (doctor-generated certs/prescriptions, sent to patient)
 *       -> GeneratedDocument
 *   - everything else (uploads) -> AppointmentDocument
 * Both are keyed by appointment + doctor. The MedicalDocument rows are LEFT in
 * place (patient's /account/medical-files view). Drives off the already-loaded
 * MedicalDocument rows (legacyMongoId), so only object-verified docs are routed.
 *
 *   DUMP_DIR=... DRY_RUN=false node --import tsx scripts/legacy-migration/load-doctor-documents.ts
 *
 * Idempotent: upserts on legacyMongoId. Re-run after load-documents.
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { requireDumpDir, DRY_RUN, banner } from "./lib/config.js";
import { readCollection, hasCollection, type SourceDoc } from "./lib/source.js";
import { MARKETS, patientCollection, marketToCountryCode } from "./lib/markets.js";
import { mapDocument, collectDocArrays, str } from "./lib/mapping.js";
import { Counter, logUnresolved } from "./lib/report.js";

const STAGE = "doctor-documents";

interface Appt { id: string; doctorId: string | null; scheduledAt: Date | null; createdAt: Date }
interface MedDoc { patientProfileId: string; fileName: string; mimetype: string; byteSize: number }

function genType(raw: unknown): "ABSENCE_CERTIFICATE" | "EXAMS_PRESCRIPTION" | "PRESCRIPTION" | "OTHER" {
  const s = str(raw)?.toLowerCase() ?? "";
  if (s === "absence-certificate") return "ABSENCE_CERTIFICATE";
  if (s === "exams-prescription") return "EXAMS_PRESCRIPTION";
  if (s === "prescription") return "PRESCRIPTION";
  return "OTHER";
}

async function preloadMedDocs(): Promise<Map<string, MedDoc>> {
  const map = new Map<string, MedDoc>();
  const take = 1000;
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.medicalDocument.findMany({
      where: { legacyMongoId: { not: null } },
      take,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, legacyMongoId: true, patientProfileId: true, fileName: true, mimetype: true, byteSize: true },
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      if (r.legacyMongoId)
        map.set(r.legacyMongoId, {
          patientProfileId: r.patientProfileId,
          fileName: r.fileName,
          mimetype: r.mimetype,
          byteSize: r.byteSize,
        });
    }
    cursor = rows[rows.length - 1].id;
    if (rows.length < take) break;
  }
  return map;
}

async function preloadProfiles(): Promise<Map<string, { id: string; email: string; fullName: string | null }>> {
  const map = new Map<string, { id: string; email: string; fullName: string | null }>();
  const take = 1000;
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.patientProfile.findMany({
      take, orderBy: { id: "asc" }, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, email: true, fullName: true, legacyMongoIds: true },
    });
    if (rows.length === 0) break;
    for (const r of rows) for (const lid of r.legacyMongoIds) map.set(lid, { id: r.id, email: r.email, fullName: r.fullName });
    cursor = rows[rows.length - 1].id;
    if (rows.length < take) break;
  }
  return map;
}

async function preloadApptsByEmail(): Promise<Map<string, Appt[]>> {
  const map = new Map<string, Appt[]>();
  const take = 1000;
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.appointment.findMany({
      take, orderBy: { id: "asc" }, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, email: true, doctorId: true, scheduledAt: true, createdAt: true },
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      const k = r.email.toLowerCase();
      const arr = map.get(k) ?? [];
      arr.push({ id: r.id, doctorId: r.doctorId, scheduledAt: r.scheduledAt, createdAt: r.createdAt });
      map.set(k, arr);
    }
    cursor = rows[rows.length - 1].id;
    if (rows.length < take) break;
  }
  return map;
}

async function preloadDoctors(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const rows = await prisma.doctor.findMany({ where: { legacyMongoId: { not: null } }, select: { id: true, legacyMongoId: true } });
  for (const r of rows) if (r.legacyMongoId) map.set(r.legacyMongoId, r.id);
  return map;
}

function pickByTime(pool: Appt[], when: Date | null): Appt {
  if (when) {
    const t = when.getTime();
    return [...pool].sort((a, b) =>
      Math.abs((a.scheduledAt ?? a.createdAt).getTime() - t) - Math.abs((b.scheduledAt ?? b.createdAt).getTime() - t))[0];
  }
  return [...pool].sort((a, b) => (a.scheduledAt ?? a.createdAt).getTime() - (b.scheduledAt ?? b.createdAt).getTime())[0];
}

async function main() {
  requireDumpDir();
  banner(STAGE);
  const c = new Counter();
  console.log("  preloading medical docs + profiles + appts + doctors…");
  const medDocs = await preloadMedDocs();
  const profiles = await preloadProfiles();
  const apptByEmail = await preloadApptsByEmail();
  const doctorMap = await preloadDoctors();
  console.log(`  ${medDocs.size} medical docs, ${profiles.size} legacy ids, ${apptByEmail.size} emails w/ appts.\n`);

  const syntheticByPatientDoctor = new Map<string, string>();

  async function ensureSyntheticAppt(patientLegacyId: string, market: string, email: string, fullName: string, doctorId: string): Promise<string> {
    const key = `${patientLegacyId}:${doctorId}`;
    const cached = syntheticByPatientDoctor.get(key);
    if (cached) return cached;
    const legacyMongoId = `legacy-doc:${key}`;
    const appt = await prisma.appointment.upsert({
      where: { legacyMongoId },
      update: { doctorId },
      create: {
        legacyMongoId, countryCode: marketToCountryCode(market as never), consultationType: "legacy-records",
        fullName: fullName || "Unknown", email, consentAccepted: true, status: "COMPLETED", manualEntry: true,
        finalized: true, doctorId, notes: "Auto-created during migration to hold imported legacy documents.",
      },
      select: { id: true },
    });
    syntheticByPatientDoctor.set(key, appt.id);
    return appt.id;
  }

  for (const market of MARKETS) {
    const coll = patientCollection(market);
    if (!hasCollection(coll)) continue;

    for await (const doc of readCollection(coll)) {
      const legacyId = typeof doc._id === "string" ? doc._id : String(doc._id ?? "");
      const arrays = collectDocArrays(doc);
      if (arrays.length === 0) continue;
      const profile = legacyId ? profiles.get(legacyId) : undefined;
      if (!profile) continue;
      const appts = apptByEmail.get(profile.email.toLowerCase()) ?? [];

      let ordinal = 0;
      for (const arr of arrays) {
        for (const el of arr.elements) {
          const m = mapDocument(el, legacyId, ordinal, arr.arrayName);
          ordinal += 1;
          if (!m) continue;
          const med = medDocs.get(m.legacyMongoId);
          if (!med) continue; // dead ref / no object -> already skipped in MedicalDocument
          c.bump("read");

          const uploadedByDoctorId = m.legacyUploadedBy ? doctorMap.get(m.legacyUploadedBy) ?? null : null;

          // choose a real appt with a doctor; else fall back to uploader + synthetic
          const withDoc = appts.filter((a) => a.doctorId);
          const sameDoc = uploadedByDoctorId ? withDoc.filter((a) => a.doctorId === uploadedByDoctorId) : [];
          const pool = sameDoc.length ? sameDoc : withDoc;
          let appointmentId: string | null = null;
          let doctorId: string | null = null;
          if (pool.length) {
            const a = pickByTime(pool, m.uploadedAt);
            appointmentId = a.id;
            doctorId = a.doctorId;
          } else if (uploadedByDoctorId) {
            doctorId = uploadedByDoctorId;
          }

          if (!doctorId) {
            await logUnresolved({
              stage: STAGE, sourceColl: coll, legacyId, columnName: "doctorId",
              legacyValue: m.legacyUploadedBy,
              reason: "no doctor to attach doc to (no appt w/ doctor, uploader unresolved) — stays in MedicalDocument only",
            });
            c.bump("no-doctor");
            continue;
          }

          if (DRY_RUN) {
            c.bump(m.uploadedByRole === "SYSTEM" ? "would-generated" : "would-upload");
            continue;
          }

          if (!appointmentId) {
            appointmentId = await ensureSyntheticAppt(legacyId, market, profile.email, profile.fullName ?? "Unknown", doctorId);
          }

          if (m.uploadedByRole === "SYSTEM") {
            await prisma.generatedDocument.upsert({
              where: { legacyMongoId: m.legacyMongoId },
              update: { appointmentId, doctorId, sentToPatient: m.visibleToPatient },
              create: {
                legacyMongoId: m.legacyMongoId, appointmentId, doctorId, patientEmail: profile.email,
                documentType: genType(el.documentType), fileName: med.fileName, storageKey: m.objectKey,
                sentToPatient: m.visibleToPatient,
              },
            });
            c.bump("generated");
          } else {
            await prisma.appointmentDocument.upsert({
              where: { legacyMongoId: m.legacyMongoId },
              update: { appointmentId, doctorId },
              create: {
                legacyMongoId: m.legacyMongoId, appointmentId, doctorId, label: med.fileName,
                storageKey: m.objectKey, mimetype: med.mimetype, byteSize: med.byteSize,
              },
            });
            c.bump("upload");
          }
        }
      }
    }
  }

  console.log(`\n${STAGE} done: ${c.summary()}`);
}

main().catch((e) => { console.error(`${STAGE} failed:`, e); process.exit(1); }).finally(() => prisma.$disconnect());

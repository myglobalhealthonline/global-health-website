/**
 * Phase 2 — load patients_*.medicalNotes[] -> MedicalNote rows (doctor-facing).
 * Run after load-patients AND load-appointments.
 *
 *   DUMP_DIR=... node --import tsx scripts/legacy-migration/load-notes.ts             # dry
 *   DUMP_DIR=... DRY_RUN=false node --import tsx scripts/legacy-migration/load-notes.ts
 *
 * MedicalNote requires an appointment + a real doctor author (onDelete: Restrict):
 *   - each note is attached to the patient's appointment that best matches its
 *     author + createdAt; if the patient has NO appointment, one synthetic
 *     "legacy-records" appointment is created per patient to hold their notes.
 *   - a note whose author doctor can't be resolved is logged + skipped (we do
 *     not fabricate a doctor identity).
 *   - Idempotent: upserts on legacyMongoId.
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { requireDumpDir, DRY_RUN, banner } from "./lib/config.js";
import { readCollection, hasCollection, type SourceDoc } from "./lib/source.js";
import { MARKETS, patientCollection, marketToCountryCode } from "./lib/markets.js";
import { mapNote, NOTES_FIELD } from "./lib/mapping.js";
import { Counter, logUnresolved } from "./lib/report.js";

const STAGE = "notes";

interface Appt {
  id: string;
  doctorId: string | null;
  scheduledAt: Date | null;
  createdAt: Date;
}

async function preloadDoctors(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const rows = await prisma.doctor.findMany({
    where: { legacyMongoId: { not: null } },
    select: { id: true, legacyMongoId: true },
  });
  for (const r of rows) if (r.legacyMongoId) map.set(r.legacyMongoId, r.id);
  return map;
}

async function preloadProfiles(): Promise<Map<string, { id: string; email: string; fullName: string | null }>> {
  const map = new Map<string, { id: string; email: string; fullName: string | null }>();
  const take = 1000;
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.patientProfile.findMany({
      take,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, email: true, fullName: true, legacyMongoIds: true },
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      for (const lid of r.legacyMongoIds) map.set(lid, { id: r.id, email: r.email, fullName: r.fullName });
    }
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
      take,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, email: true, doctorId: true, scheduledAt: true, createdAt: true },
    });
    if (rows.length === 0) break;
    for (const r of rows) {
      const key = r.email.toLowerCase();
      const arr = map.get(key) ?? [];
      arr.push({ id: r.id, doctorId: r.doctorId, scheduledAt: r.scheduledAt, createdAt: r.createdAt });
      map.set(key, arr);
    }
    cursor = rows[rows.length - 1].id;
    if (rows.length < take) break;
  }
  return map;
}

function pickAppointment(appts: Appt[], authorDoctorId: string | null, when: Date | null): string | null {
  if (appts.length === 0) return null;
  const sameDoc = authorDoctorId ? appts.filter((a) => a.doctorId === authorDoctorId) : [];
  const pool = sameDoc.length ? sameDoc : appts;
  if (when) {
    const t = when.getTime();
    return [...pool].sort((a, b) => {
      const at = (a.scheduledAt ?? a.createdAt).getTime();
      const bt = (b.scheduledAt ?? b.createdAt).getTime();
      return Math.abs(at - t) - Math.abs(bt - t);
    })[0].id;
  }
  return [...pool].sort(
    (a, b) => (a.scheduledAt ?? a.createdAt).getTime() - (b.scheduledAt ?? b.createdAt).getTime(),
  )[0].id;
}

async function ensureSyntheticAppointment(
  patientLegacyId: string,
  countryCode: string,
  email: string,
  fullName: string,
): Promise<string> {
  const legacyMongoId = `legacy-records:${patientLegacyId}`;
  const appt = await prisma.appointment.upsert({
    where: { legacyMongoId },
    update: {},
    create: {
      legacyMongoId,
      countryCode,
      consultationType: "legacy-records",
      fullName: fullName || "Unknown",
      email,
      consentAccepted: true,
      status: "COMPLETED",
      manualEntry: true,
      finalized: true,
      notes: "Auto-created during migration to hold imported legacy clinical notes.",
    },
    select: { id: true },
  });
  return appt.id;
}

async function main() {
  requireDumpDir();
  banner(STAGE);
  const c = new Counter();
  console.log("  preloading doctors + profiles + appointments…");
  const doctorMap = await preloadDoctors();
  const profileMap = await preloadProfiles();
  const apptByEmail = await preloadApptsByEmail();
  console.log(`  ${doctorMap.size} doctors, ${profileMap.size} legacy ids, ${apptByEmail.size} emails w/ appts.\n`);

  for (const market of MARKETS) {
    const coll = patientCollection(market);
    if (!hasCollection(coll)) continue;

    for await (const doc of readCollection(coll)) {
      const legacyId = typeof doc._id === "string" ? doc._id : String(doc._id ?? "");
      const notes = Array.isArray(doc[NOTES_FIELD]) ? (doc[NOTES_FIELD] as SourceDoc[]) : [];
      if (notes.length === 0) continue;

      const profile = legacyId ? (profileMap.get(legacyId) ?? null) : null;
      if (!profile) {
        await logUnresolved({
          stage: STAGE,
          sourceColl: coll,
          legacyId,
          columnName: "patientEmail",
          reason: "no PatientProfile — run load-patients first",
        });
        c.bump("orphan-patient", notes.length);
        continue;
      }

      const appts: Appt[] = [...(apptByEmail.get(profile.email.toLowerCase()) ?? [])];
      let syntheticId: string | null = null;

      let ordinal = 0;
      for (const el of notes) {
        const n = mapNote(el);
        const idx = ordinal;
        ordinal += 1;
        c.bump("read");
        if (!n.content) {
          c.bump("empty-skipped");
          continue;
        }

        const authorDoctorId = n.legacyAuthorId ? (doctorMap.get(n.legacyAuthorId) ?? null) : null;
        if (!authorDoctorId) {
          await logUnresolved({
            stage: STAGE,
            sourceColl: coll,
            legacyId,
            columnName: "createdByDoctorId",
            legacyValue: n.legacyAuthorId,
            reason: "note author did not resolve to a migrated Doctor — note skipped",
          });
          c.bump("author-unresolved");
          continue;
        }

        let appointmentId = pickAppointment(appts, authorDoctorId, n.createdAt);
        if (!appointmentId) {
          if (DRY_RUN) {
            c.bump("would-synthesize-appt");
          } else {
            if (!syntheticId) {
              syntheticId = await ensureSyntheticAppointment(
                legacyId,
                marketToCountryCode(market),
                profile.email,
                profile.fullName ?? "Unknown",
              );
              appts.push({
                id: syntheticId,
                doctorId: null,
                scheduledAt: null,
                createdAt: new Date(),
              });
            }
            appointmentId = syntheticId;
          }
        }

        const noteLegacyId = n.legacyId ?? `${legacyId}:note:${idx}`;
        if (DRY_RUN) {
          console.log(
            `  [dry] note ${noteLegacyId} patient=${profile.email} author=${authorDoctorId} ` +
              `appt=${appointmentId ?? "(synthetic)"}`,
          );
          c.bump("would-write");
          continue;
        }

        await prisma.medicalNote.upsert({
          where: { legacyMongoId: noteLegacyId },
          update: { content: n.content, consultationType: n.consultationType },
          create: {
            legacyMongoId: noteLegacyId,
            appointmentId: appointmentId!,
            patientEmail: profile.email,
            content: n.content,
            consultationType: n.consultationType,
            createdByDoctorId: authorDoctorId,
            createdByName: n.authorName ?? "Unknown",
            ...(n.createdAt ? { createdAt: n.createdAt } : {}),
          },
        });
        c.bump("written");
      }
    }
  }

  console.log(`\n${STAGE} done: ${c.summary()}`);
}

main()
  .catch((err) => {
    console.error(`${STAGE} failed:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

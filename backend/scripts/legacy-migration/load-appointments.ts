/**
 * Phase 2 — load Appointments -> Appointment. Run after Phase 1 (doctors +
 * patients) so doctor/patient links resolve.
 *
 *   DUMP_DIR=... node --import tsx scripts/legacy-migration/load-appointments.ts             # dry
 *   DUMP_DIR=... DRY_RUN=false node --import tsx scripts/legacy-migration/load-appointments.ts
 *
 * Links:
 *   - patient link is by EMAIL snapshot (Appointment has no patient FK). If no
 *     PatientProfile matches the email the appointment is still created; the
 *     orphan is logged.
 *   - doctorId resolves via Doctor.legacyMongoId; unresolved -> null + logged.
 *   - stripe ids + orderNumber are kept in legacyExtra (NOT the unique columns)
 *     so a legacy value can never clash with a native row's unique constraint.
 *   - Idempotent: upserts on legacyMongoId.
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { requireDumpDir, DRY_RUN, banner } from "./lib/config.js";
import { readCollection, hasCollection, type SourceDoc } from "./lib/source.js";
import { isMarket, countryCodeToMarket, type Market } from "./lib/markets.js";
import { mapAppointment } from "./lib/mapping.js";
import { Counter, logUnresolved } from "./lib/report.js";

const SOURCE = "Appointments";
const STAGE = "appointments";

function resolveMarket(doc: SourceDoc): Market | null {
  for (const key of ["market", "country", "countryCode"]) {
    const raw = doc[key];
    if (raw == null) continue;
    const s = String(raw).trim().toLowerCase();
    if (isMarket(s)) return s;
    if (s.length === 2) {
      const m = countryCodeToMarket(s);
      if (m) return m;
    }
  }
  return null;
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

// Maps lowercased email -> PatientProfile.userId (null when the profile has
// no linked account yet). Used both for the orphan check and — critically —
// to resolve Appointment.userId at import time so a legacy row whose email
// matches an already-linked patient doesn't end up with userId=null (that
// silently breaks the medical-access guard's doctor-treatment-relationship
// join, which requires Appointment.userId; see backend/scripts/relink-appointment-users.ts).
async function preloadEmails(): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const take = 1000;
  let cursor: string | undefined;
  for (;;) {
    const rows = await prisma.patientProfile.findMany({
      take,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, email: true, userId: true },
    });
    if (rows.length === 0) break;
    for (const r of rows) map.set(r.email.toLowerCase(), r.userId);
    cursor = rows[rows.length - 1].id;
    if (rows.length < take) break;
  }
  return map;
}

async function main() {
  requireDumpDir();
  banner(STAGE);
  if (!hasCollection(SOURCE)) {
    console.log(`No ${SOURCE} export — nothing to do.`);
    return;
  }

  const c = new Counter();
  console.log("  preloading doctors + patient emails…");
  const doctorMap = await preloadDoctors();
  const emailSet = await preloadEmails();
  console.log(`  ${doctorMap.size} doctors, ${emailSet.size} patient emails.\n`);

  for await (const doc of readCollection(SOURCE)) {
    c.bump("read");
    const legacyId = str(doc._id);
    if (!legacyId) {
      await logUnresolved({ stage: STAGE, sourceColl: SOURCE, reason: "appointment has no _id" });
      c.bump("skipped");
      continue;
    }

    const market = resolveMarket(doc);
    if (!market) {
      await logUnresolved({
        stage: STAGE,
        sourceColl: SOURCE,
        legacyId,
        columnName: "countryCode",
        reason: "could not resolve market/country — appointment skipped",
      });
      c.bump("skipped-no-market");
      continue;
    }

    const m = mapAppointment(doc, market);
    if (!m.email) {
      await logUnresolved({
        stage: STAGE,
        sourceColl: SOURCE,
        legacyId,
        columnName: "email",
        reason: "appointment has no email — skipped (email is required)",
      });
      c.bump("skipped-no-email");
      continue;
    }
    const email = m.email.toLowerCase();

    const doctorId = m.legacyDoctorId ? (doctorMap.get(m.legacyDoctorId) ?? null) : null;
    if (m.legacyDoctorId && !doctorId) {
      await logUnresolved({
        stage: STAGE,
        sourceColl: SOURCE,
        legacyId,
        columnName: "doctorId",
        legacyValue: m.legacyDoctorId,
        reason: "no Doctor with that legacyMongoId — doctorId left null",
      });
    }

    // Orphan check (informational): does a patient exist for this email?
    const patientUserId = emailSet.get(email) ?? null;
    if (!emailSet.has(email)) {
      await logUnresolved({
        stage: STAGE,
        sourceColl: SOURCE,
        legacyId,
        columnName: "patient(email)",
        legacyValue: email,
        reason: "no PatientProfile for this email — appointment kept, patient orphaned",
      });
      c.bump("orphan-patient");
    }

    // `serviceName` is not an Appointment column (service is linked by serviceId);
    // keep it in legacyExtra so it isn't lost.
    const { serviceName, ...appointmentData } = m.data;
    const legacyExtra: Record<string, unknown> = { ...m.extra };
    if (m.orderNumber) legacyExtra.orderNumber = m.orderNumber;
    if (serviceName) legacyExtra.serviceName = serviceName;
    if (m.legacyDoctorId) legacyExtra.legacyDoctorId = m.legacyDoctorId;
    if (m.legacyPatientId) legacyExtra.legacyPatientId = m.legacyPatientId;

    if (DRY_RUN) {
      console.log(
        `  [dry] appt ${legacyId} ${market} <${email}> status=${m.data.status} ` +
          `pay=${m.data.paymentStatus} doctor=${doctorId ?? "-"} order=${m.orderNumber ?? "-"}`,
      );
      c.bump("would-write");
      continue;
    }

    const data = {
      ...appointmentData,
      email,
      doctorId,
      userId: patientUserId,
      legacyExtra: Object.keys(legacyExtra).length ? (legacyExtra as object) : undefined,
      formResponses: (m.data.formResponses ?? undefined) as object | undefined,
    };
    await prisma.appointment.upsert({
      where: { legacyMongoId: legacyId },
      update: {
        status: data.status,
        paymentStatus: data.paymentStatus,
        doctorId,
        // Same source-of-truth-wins treatment as doctorId above: if the
        // email now resolves to a linked account, stamp it on re-run too.
        // Never clears an existing userId back to null (patientUserId is
        // only ever a resolved id or omitted).
        ...(patientUserId ? { userId: patientUserId } : {}),
        scheduledAt: data.scheduledAt,
        meetingUrl: data.meetingUrl,
        finalized: data.finalized,
      },
      create: { legacyMongoId: legacyId, ...data },
    });
    c.bump("written");
  }

  console.log(`\n${STAGE} done: ${c.summary()}`);
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

main()
  .catch((err) => {
    console.error(`${STAGE} failed:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

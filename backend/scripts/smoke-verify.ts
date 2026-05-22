import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

/**
 * Auto-verifies the §11 T25 smoke flows that leave observable DB
 * state — registrations rows, audit log entries, schema columns,
 * payload shape on backend HTTP endpoints. Flows that only manifest
 * in the UI (alert banner colour, "Where" card rendering, doctor
 * profile CTA label) still need human eyes, but we narrow that gap
 * to the truly visual-only items.
 *
 * Usage: pnpm tsx scripts/smoke-verify.ts
 */

type Check = {
  flow: string;
  description: string;
  status: "pass" | "fail" | "manual";
  detail: string;
};

const checks: Check[] = [];

function record(flow: string, description: string, status: Check["status"], detail: string) {
  checks.push({ flow, description, status, detail });
}

const BACKEND = "https://backend-global-health-website.up.railway.app";

async function flow1Registrations() {
  // Flow 1 — Admin sets registration on a doctor. Observable: at least
  // one DoctorCountry row with registrationNumber populated AND an
  // audit log row for DOCTOR_UPDATED with that registration metadata.
  const rows = await prisma.doctorCountry.findMany({
    where: { registrationNumber: { not: null } },
  });
  if (rows.length === 0) {
    return record(
      "1",
      "Doctor registration rows present",
      "fail",
      "No DoctorCountry rows with registrationNumber — backfill or admin save not landed",
    );
  }
  record(
    "1",
    "Doctor registration rows present",
    "pass",
    `${rows.length} DoctorCountry row(s) with registrationNumber set`,
  );

  const audit = await prisma.auditLog.findFirst({
    where: { action: "DOCTOR_UPDATED" },
    orderBy: { createdAt: "desc" },
  });
  if (!audit) {
    return record(
      "1b",
      "DOCTOR_UPDATED audit emitted",
      "manual",
      "No DOCTOR_UPDATED audit row yet — admin hasn't touched the Registrations card live (backfill upserts directly, doesn't emit audit). Re-check after first admin write.",
    );
  }
  record(
    "1b",
    "DOCTOR_UPDATED audit emitted",
    "pass",
    `Last DOCTOR_UPDATED at ${audit.createdAt.toISOString()}`,
  );
}

async function flow3Alerts() {
  // Flow 3 — Doctor sets statusAlert. Observable: PatientProfile with
  // statusAlert set AND a PATIENT_ALERT_UPDATED audit row.
  const profiles = await prisma.patientProfile.findMany({
    where: { statusAlert: { not: null } },
  });
  if (profiles.length === 0) {
    return record(
      "3",
      "Patient statusAlert set",
      "manual",
      "No PatientProfile row has statusAlert yet — doctor hasn't set one in prod. Verify on /doctor after a doctor writes an alert.",
    );
  }
  record(
    "3",
    "Patient statusAlert set",
    "pass",
    `${profiles.length} patient profile(s) with statusAlert`,
  );

  const audit = await prisma.auditLog.findFirst({
    where: { action: "PATIENT_ALERT_UPDATED" },
    orderBy: { createdAt: "desc" },
  });
  if (!audit) {
    return record(
      "3b",
      "PATIENT_ALERT_UPDATED audit emitted",
      "fail",
      "Alerts set but no audit row — audit hook may be misfiring",
    );
  }
  record(
    "3b",
    "PATIENT_ALERT_UPDATED audit emitted",
    "pass",
    `Last PATIENT_ALERT_UPDATED at ${audit.createdAt.toISOString()}`,
  );
}

async function flow4InPersonAppointments() {
  // Flow 4 — Admin schedules IN_PERSON with clinic. Observable:
  // Appointment where consultationMode=IN_PERSON AND (clinicId OR
  // locationAddress) is set.
  const inperson = await prisma.appointment.findMany({
    where: {
      consultationMode: "IN_PERSON",
      OR: [
        { clinicId: { not: null } },
        { locationAddress: { not: null } },
      ],
    },
    select: { id: true, clinicId: true, locationAddress: true },
  });
  if (inperson.length === 0) {
    return record(
      "4",
      "IN_PERSON appointment with location",
      "manual",
      "No IN_PERSON appointments yet — flip an existing appointment to IN_PERSON via /admin/appointments/[id] to verify the new mode toggle.",
    );
  }
  record(
    "4",
    "IN_PERSON appointment with location",
    "pass",
    `${inperson.length} IN_PERSON appointment(s) with location set`,
  );
}

async function flow6LoginAudit() {
  // Flow 6 — Login + logout + bad-password. Observable: AuditLog rows
  // for LOGIN, LOGOUT, LOGIN_FAILED (any of them).
  const counts = await Promise.all([
    prisma.auditLog.count({ where: { action: "LOGIN" } }),
    prisma.auditLog.count({ where: { action: "LOGOUT" } }),
    prisma.auditLog.count({ where: { action: "LOGIN_FAILED" } }),
  ]);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return record(
      "6",
      "Login audit hooks firing",
      "manual",
      "No LOGIN / LOGOUT / LOGIN_FAILED rows yet — log in once via the live site to trigger.",
    );
  }
  record(
    "6",
    "Login audit hooks firing",
    "pass",
    `LOGIN=${counts[0]}, LOGOUT=${counts[1]}, LOGIN_FAILED=${counts[2]}`,
  );

  // Bonus: check entityId is empty for LOGIN_FAILED (per our H3 fix).
  const failedSample = await prisma.auditLog.findFirst({
    where: { action: "LOGIN_FAILED" },
    orderBy: { createdAt: "desc" },
  });
  if (failedSample) {
    if (failedSample.entityId === "") {
      record(
        "6b",
        "LOGIN_FAILED uses empty entityId (H3 fix)",
        "pass",
        "entityId is blank; email still in metadata",
      );
    } else {
      record(
        "6b",
        "LOGIN_FAILED uses empty entityId (H3 fix)",
        "fail",
        `entityId is "${failedSample.entityId}" — fix didn't land`,
      );
    }
  }
}

async function flow8ManualEntryFlag() {
  // Flow 8 — canCreateManualAppointments. Observable: column exists +
  // at least one doctor row with a value (anything, default false fine).
  const doctorCount = await prisma.doctor.count();
  const truthy = await prisma.doctor.count({
    where: { canCreateManualAppointments: true },
  });
  record(
    "8",
    "canCreateManualAppointments column wired",
    "pass",
    `${doctorCount} doctor(s) total, ${truthy} with flag=true`,
  );
}

async function flow9RxRegistration() {
  // Flow 9 — Rx PDF for IE doctor. Observable: doctors with both a
  // legacy imcRegistration AND a matching DoctorCountry row exist
  // (backfill landed, drift = 0). PDF rendering itself is binary
  // output — can't auto-verify without rendering.
  const drift = await prisma.$queryRawUnsafe<
    Array<{ count: bigint }>
  >(
    `SELECT COUNT(*)::bigint AS count
     FROM "Doctor" d
     LEFT JOIN "DoctorCountry" dc
       ON dc."doctorId" = d.id
      AND dc."countryId" = (SELECT id FROM "Country" WHERE code = 'ie' LIMIT 1)
     WHERE d."imcRegistration" IS NOT NULL AND d."imcRegistration" <> ''
       AND (dc."registrationNumber" IS NULL
            OR dc."registrationNumber" <> d."imcRegistration")`,
  );
  const driftCount = Number(drift[0]?.count ?? 0n);
  if (driftCount > 0) {
    return record(
      "9",
      "IE Rx registration drift",
      "fail",
      `${driftCount} doctor(s) out of sync between legacy + DoctorCountry`,
    );
  }
  record(
    "9",
    "IE Rx registration drift",
    "pass",
    "0 doctors out of sync — Rx header will print IMC + number for IE",
  );

  // Visual PDF still needs human verification; flag as manual.
  record(
    "9b",
    "Rendered PDF header text (visual)",
    "manual",
    "Generate a real Rx via /doctor/appointments/[id] and confirm 'IMC: IMC 542074' lands in the header",
  );
}

async function flow10BookingNationalId() {
  // Flow 10 — Booking form national ID persisting. Observable:
  // PatientProfile.nationalIdNumber or taxIdNumber populated.
  const withId = await prisma.patientProfile.count({
    where: {
      OR: [
        { nationalIdNumber: { not: null } },
        { taxIdNumber: { not: null } },
        { passportNumber: { not: null } },
      ],
    },
  });
  if (withId === 0) {
    return record(
      "10",
      "Patient identity IDs on file",
      "manual",
      "No PatientProfile has any nationalId/taxId/passport yet — first patient with a country-aware booking form submission will populate this.",
    );
  }
  record(
    "10",
    "Patient identity IDs on file",
    "pass",
    `${withId} patient profile(s) with at least one ID stored`,
  );
}

async function backendApiSmoke() {
  // The 6 public endpoints we already curled successfully — re-run as
  // part of the script so a single run gives the full picture.
  const endpoints = [
    "/api/doctors",
    "/api/countries/ie/doctors",
    "/api/countries/ie/services?kind=GENERAL",
    "/api/countries/ie/services?kind=SPECIALIST",
    "/api/countries/ie/health-tests",
    "/api/countries/ie/pages/HOME?locale=EN",
  ];
  for (const p of endpoints) {
    try {
      const res = await fetch(`${BACKEND}${p}`);
      if (res.status === 200) {
        record(
          "API",
          `GET ${p}`,
          "pass",
          `HTTP 200`,
        );
      } else {
        record(
          "API",
          `GET ${p}`,
          "fail",
          `HTTP ${res.status}`,
        );
      }
    } catch (err) {
      record(
        "API",
        `GET ${p}`,
        "fail",
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

(async () => {
  console.log("[smoke] auto-verifying §11 T25 flows where the DB / API can speak for itself\n");

  await backendApiSmoke();
  await flow1Registrations();
  await flow3Alerts();
  await flow4InPersonAppointments();
  await flow6LoginAudit();
  await flow8ManualEntryFlag();
  await flow9RxRegistration();
  await flow10BookingNationalId();

  console.log("\n=== RESULTS ===");
  const pass = checks.filter((c) => c.status === "pass").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  const manual = checks.filter((c) => c.status === "manual").length;
  for (const c of checks) {
    const icon =
      c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "·";
    console.log(`[${icon}] flow ${c.flow.padEnd(3)} ${c.description}`);
    console.log(`    ${c.detail}`);
  }
  console.log(
    `\nSummary: ${pass} pass / ${fail} fail / ${manual} need human verification`,
  );

  await prisma.$disconnect();
  if (fail > 0) process.exitCode = 1;
})();

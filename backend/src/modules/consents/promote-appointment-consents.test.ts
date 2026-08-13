import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * GH-2026-001436 root-cause coverage: promoteAppointmentConsents is the only
 * thing that turns an appointment's booking-time consent choice
 * (medicalAccessConsentScope / crossBorderConsentAccepted) into the
 * PatientConsent rows the medical-access guard actually reads. Nothing
 * exercised it before this — the incident's real root cause (a case-mismatched
 * email causing resolveOrCreatePatientProfile to throw P2002, swallowed by a
 * bare `.catch(() => {})` in every caller) went undetected because no test
 * asserted consent rows land at all, let alone survive a case mismatch.
 *
 * Uses the real local test DB (no mocking) — the function's job IS the DB
 * write, so a Prisma fake would test nothing.
 */
describe("promoteAppointmentConsents", () => {
  let prisma: PrismaClient;
  let promoteAppointmentConsents: typeof import("./promote-appointment-consents.js")["promoteAppointmentConsents"];

  const uniq = `promo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const userIds: string[] = [];
  const profileIds: string[] = [];
  const appointmentIds: string[] = [];

  before(async () => {
    prisma = (await import("../../db/prisma.js")).prisma;
    ({ promoteAppointmentConsents } = await import("./promote-appointment-consents.js"));
  });

  after(async () => {
    await prisma.patientConsent.deleteMany({ where: { patientProfileId: { in: profileIds } } });
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  function makeAppointment(overrides: {
    email: string;
    fullName: string;
    userId?: string | null;
    medicalAccessConsentScope?: string;
    crossBorderConsentAccepted?: boolean;
  }) {
    return prisma.appointment.create({
      data: {
        countryCode: "ie",
        consultationType: "GENERAL",
        consentAccepted: true,
        ...overrides,
      },
    });
  }

  it("promotes a logged-in booking's scope + cross-border consent into PatientConsent rows", async () => {
    const email = `logged-in-${uniq}@test.local`;
    const user = await prisma.user.create({
      data: { email, passwordHash: "x", fullName: "Logged In Patient", role: "PATIENT" },
    });
    userIds.push(user.id);
    const profile = await prisma.patientProfile.create({
      data: { email, userId: user.id, fullName: "Logged In Patient" },
    });
    profileIds.push(profile.id);
    const appt = await makeAppointment({
      email,
      fullName: "Logged In Patient",
      userId: user.id,
      medicalAccessConsentScope: "DIRECT",
      crossBorderConsentAccepted: true,
    });
    appointmentIds.push(appt.id);

    await promoteAppointmentConsents(user.id, email);

    const consents = await prisma.patientConsent.findMany({
      where: { patientProfileId: profile.id },
    });
    const types = consents.map((c) => c.consentType).sort();
    assert.deepEqual(types, ["CROSS_BORDER_FILE_ACCESS", "MEDICAL_ACCESS_DIRECT"]);
    assert.ok(consents.every((c) => c.consentValue === true));
    assert.ok(consents.every((c) => c.source === "BOOKING_FORM"));
  });

  it("promotes a guest booking (Appointment.userId = null) by resolving the profile via email", async () => {
    const email = `guest-${uniq}@test.local`;
    const profile = await prisma.patientProfile.create({
      data: { email, fullName: "Guest Patient" }, // no userId — guest, but already has a profile
    });
    profileIds.push(profile.id);
    const appt = await makeAppointment({
      email,
      fullName: "Guest Patient",
      userId: null,
      medicalAccessConsentScope: "GLOBAL_NETWORK",
    });
    appointmentIds.push(appt.id);

    await promoteAppointmentConsents(null, email);

    const consents = await prisma.patientConsent.findMany({
      where: { patientProfileId: profile.id },
    });
    assert.equal(consents.length, 1);
    assert.equal(consents[0].consentType, "MEDICAL_ACCESS_GLOBAL_NETWORK");
    assert.equal(consents[0].consentValue, true);
  });

  it("no-ops without throwing when a guest booking has no PatientProfile yet", async () => {
    const email = `guest-no-profile-${uniq}@test.local`;
    const appt = await makeAppointment({
      email,
      fullName: "No Profile Guest",
      userId: null,
      medicalAccessConsentScope: "DIRECT",
    });
    appointmentIds.push(appt.id);

    // Must resolve without throwing — callers fire-and-forget this.
    await assert.doesNotReject(promoteAppointmentConsents(null, email));

    const profile = await prisma.patientProfile.findUnique({ where: { email } });
    assert.equal(profile, null, "no profile was created for a guest with none");
  });

  it("is idempotent: calling twice writes each consent type only once", async () => {
    const email = `idempotent-${uniq}@test.local`;
    const user = await prisma.user.create({
      data: { email, passwordHash: "x", fullName: "Idempotent Patient", role: "PATIENT" },
    });
    userIds.push(user.id);
    const profile = await prisma.patientProfile.create({
      data: { email, userId: user.id, fullName: "Idempotent Patient" },
    });
    profileIds.push(profile.id);
    const appt = await makeAppointment({
      email,
      fullName: "Idempotent Patient",
      userId: user.id,
      medicalAccessConsentScope: "COUNTRY_CLINIC",
      crossBorderConsentAccepted: true,
    });
    appointmentIds.push(appt.id);

    await promoteAppointmentConsents(user.id, email);
    const afterFirst = await prisma.patientConsent.count({ where: { patientProfileId: profile.id } });
    assert.equal(afterFirst, 2); // COUNTRY_CLINIC + CROSS_BORDER_FILE_ACCESS

    // Second call — same appointment, same scope. Must dedupe on the
    // existing source="BOOKING_FORM" rows rather than writing duplicates.
    await promoteAppointmentConsents(user.id, email);
    const afterSecond = await prisma.patientConsent.count({ where: { patientProfileId: profile.id } });
    assert.equal(afterSecond, 2, "second call is a genuine no-op, not a duplicate write");
  });

  it("root cause (GH-2026-001436): a MIXED-CASE email still resolves the existing lowercase profile", async () => {
    const lowerEmail = `mixedcase-${uniq}@test.local`;
    const mixedEmail = `MixedCase-${uniq}@TEST.LOCAL`;
    const user = await prisma.user.create({
      data: { email: lowerEmail, passwordHash: "x", fullName: "Mixed Case Patient", role: "PATIENT" },
    });
    userIds.push(user.id);
    // PatientProfile.email is stored lowercase, exactly as it was for the
    // real incident's patient (Order.email uppercase, PatientProfile.email
    // lowercase).
    const profile = await prisma.patientProfile.create({
      data: { email: lowerEmail, userId: user.id, fullName: "Mixed Case Patient" },
    });
    profileIds.push(profile.id);
    const appt = await makeAppointment({
      email: lowerEmail,
      fullName: "Mixed Case Patient",
      userId: user.id,
      medicalAccessConsentScope: "DIRECT",
    });
    appointmentIds.push(appt.id);

    // The booking-time caller (e.g. login/payment flow) passes whatever case
    // the source record carried — Order.email in the real incident, here
    // simulated directly. Before the fix this threw P2002 inside
    // resolveOrCreatePatientProfile (case-sensitive findUnique missed the
    // existing profile, fell through to create(), collided on the unique
    // userId) — swallowed by callers' fire-and-forget .catch(), so no
    // consent row was ever written and no error surfaced anywhere.
    await assert.doesNotReject(promoteAppointmentConsents(user.id, mixedEmail));

    const allProfiles = await prisma.patientProfile.findMany({ where: { userId: user.id } });
    assert.equal(allProfiles.length, 1, "must not create a second profile for the same user");
    assert.equal(allProfiles[0].id, profile.id);

    const consents = await prisma.patientConsent.findMany({ where: { patientProfileId: profile.id } });
    assert.equal(consents.length, 1);
    assert.equal(consents[0].consentType, "MEDICAL_ACCESS_DIRECT");
  });
});

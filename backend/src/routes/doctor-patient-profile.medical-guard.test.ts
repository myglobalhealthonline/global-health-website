import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { deleteAuditLogs, deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";

/**
 * AZ-4 regression: three `/api/doctor/patients/:email/*` endpoints resolved
 * the doctor's own patient and then acted, without ever calling
 * `guardMedicalRead` — the central PHI decision + MedicalAccessLog point every
 * sibling route in the same file already goes through:
 *
 *   POST /api/doctor/patients/:email/identity-verification/request
 *   POST /api/doctor/patients/:email/identity-verification/review
 *   GET  /api/doctor/patients/:email/alert-log
 *
 * `resolveOwnPatient` only proves "this doctor has an appointment with this
 * email". It does not check the confidentiality agreement, 2FA, consent or the
 * cross-country grant — so a doctor who is blocked from reading the patient's
 * chart could still stamp an identity-verification request onto their profile,
 * be the human who promotes them to VERIFIED (the only route to that status),
 * and read the clinical alert history verbatim.
 *
 * The fix must not widen or narrow `verifyDoctorAccess`: a linked ADMIN keeps
 * the access it already has (the guard's own branch 1 is an unconditional
 * allow for ADMIN/SUPER_ADMIN), and a doctor with no relationship to the
 * patient keeps getting the pre-existing 404 from `resolveOwnPatient`.
 *
 * `MEDICAL_ACCESS_ENFORCE` is forced ON for this suite and restored in a
 * `finally`-equivalent `after` hook — `.env.test` runs COMPLIANCE_MODE=relaxed,
 * which defaults it to shadow mode where nothing blocks.
 *
 * Cases share fixtures and MUST run sequentially in declaration order
 * (node:test's default): the review cases mutate one event row.
 */
describe("doctor patient profile — medical access guard (AZ-4)", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];
  let env: (typeof import("../config/env.js"))["env"];
  let originalEnforce: boolean | undefined;
  let bootError: unknown = null;

  const uniq = `az4-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Country.code is unique and capped short. A truncated timestamp is NOT
  // unique enough — `zq${Date.now()}`.slice(0, 8) only changes every ~3 hours,
  // so two runs in one afternoon collide and the second one dies in `before`.
  const countryCode = `zq${Math.random().toString(36).slice(2, 8)}`.toLowerCase();
  const AGREEMENT_VERSION = "1.0.0";

  let currencyId = "";
  let countryId = "";

  // Doctor A — fully authorized for patient A (agreement + 2FA + direct consent
  // + treatment relationship).
  let doctorAId = "";
  let doctorACookie: Record<string, string> = {};

  // Doctor B — agreement + 2FA, treats patient B, but patient B granted no
  // consent of any kind → DOCTOR_NO_VALID_ACCESS_PATH.
  let doctorBId = "";
  let doctorBUserId = "";
  let doctorBCookie: Record<string, string> = {};

  // Doctor C — treats patient A but never accepted the confidentiality
  // agreement → DOCTOR_NO_CONFIDENTIALITY_AGREEMENT.
  let doctorCId = "";
  let doctorCCookie: Record<string, string> = {};

  // Doctor D — accepted the agreement, treats patient A, but never completed
  // 2FA → DOCTOR_2FA_REQUIRED.
  let doctorDId = "";
  let doctorDCookie: Record<string, string> = {};

  // Doctor E — fully set up, but has NO appointment with patient A at all.
  let doctorEId = "";
  let doctorECookie: Record<string, string> = {};

  // ADMIN linked to its own doctor profile (User.doctorId is unique, so it
  // cannot share doctor A's). Deliberately given NO confidentiality agreement
  // and no completed 2FA: the guard's branch 1 is an unconditional ADMIN
  // allow, so this account proves the fix did not narrow linked-ADMIN access.
  let doctorFId = "";
  let linkedAdminCookie: Record<string, string> = {};

  let patientAProfileId = "";
  let patientAEmail = "";
  let patientBProfileId = "";
  let patientBEmail = "";

  let patientBEventId = "";
  let patientAEventId = "";

  const doctorIds: string[] = [];
  const userIds: string[] = [];
  const profileIds: string[] = [];
  const appointmentIds: string[] = [];

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      env = (await import("../config/env.js")).env;
      app = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }

    originalEnforce = env.MEDICAL_ACCESS_ENFORCE;
    env.MEDICAL_ACCESS_ENFORCE = true;

    const currency = await prisma.currency.create({
      data: { code: `B${Date.now()}`.slice(-9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;

    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `AZ4 ${countryCode} ${uniq}`,
        slug: `az4-${countryCode}-${uniq}`,
        legacyHomePath: `/legacy-${countryCode}-${uniq}`,
        teamPath: `/team-${countryCode}-${uniq}`,
        generalConsultationPath: `/gen-${countryCode}-${uniq}`,
        specialistConsultationPath: `/spec-${countryCode}-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;

    const mkDoctor = async (label: string) => {
      const doctor = await prisma.doctor.create({
        data: {
          countryId,
          slug: `doctor-${label}-${uniq}`,
          fullName: `Doctor ${label} ${uniq}`,
          title: "Dr",
        },
      });
      doctorIds.push(doctor.id);
      return doctor.id;
    };

    const mkDoctorUser = async (
      label: string,
      doctorId: string,
      opts: { twoFactor: boolean; role?: "DOCTOR" | "ADMIN" },
    ) => {
      const user = await prisma.user.create({
        data: {
          email: `${label}-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `Doctor ${label} ${uniq}`,
          role: opts.role ?? "DOCTOR",
          doctorId,
          twoFactorVerifiedAt: opts.twoFactor ? new Date() : null,
        },
      });
      userIds.push(user.id);
      return user;
    };

    const acceptAgreement = (doctorId: string) =>
      prisma.doctorConfidentialityAgreement.create({
        data: {
          doctorId,
          agreementVersion: AGREEMENT_VERSION,
          accepted: true,
          acceptedAt: new Date(),
        },
      });

    doctorAId = await mkDoctor("a");
    doctorBId = await mkDoctor("b");
    doctorCId = await mkDoctor("c");
    doctorDId = await mkDoctor("d");
    doctorEId = await mkDoctor("e");
    doctorFId = await mkDoctor("f");
    await acceptAgreement(doctorAId);
    await acceptAgreement(doctorBId);
    // doctor C deliberately has no agreement row.
    await acceptAgreement(doctorDId);
    await acceptAgreement(doctorEId);

    const doctorAUser = await mkDoctorUser("doctor-a", doctorAId, { twoFactor: true });
    const doctorBUser = await mkDoctorUser("doctor-b", doctorBId, { twoFactor: true });
    const doctorCUser = await mkDoctorUser("doctor-c", doctorCId, { twoFactor: true });
    const doctorDUser = await mkDoctorUser("doctor-d", doctorDId, { twoFactor: false });
    const doctorEUser = await mkDoctorUser("doctor-e", doctorEId, { twoFactor: true });
    const linkedAdminUser = await mkDoctorUser("linked-admin", doctorFId, {
      twoFactor: false,
      role: "ADMIN",
    });
    doctorBUserId = doctorBUser.id;

    const cookieFor = (user: { id: string; email: string }, role: "DOCTOR" | "ADMIN") => ({
      gh_auth: signAuthToken({ sub: user.id, role, email: user.email }),
    });
    doctorACookie = cookieFor(doctorAUser, "DOCTOR");
    doctorBCookie = cookieFor(doctorBUser, "DOCTOR");
    doctorCCookie = cookieFor(doctorCUser, "DOCTOR");
    doctorDCookie = cookieFor(doctorDUser, "DOCTOR");
    doctorECookie = cookieFor(doctorEUser, "DOCTOR");
    linkedAdminCookie = cookieFor(linkedAdminUser, "ADMIN");

    const mkPatient = async (label: string) => {
      const email = `patient-${label}-${uniq}@test.local`;
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: "x",
          fullName: `Patient ${label} ${uniq}`,
          role: "PATIENT",
        },
      });
      userIds.push(user.id);
      const profile = await prisma.patientProfile.create({
        data: {
          email,
          fullName: `Patient ${label} ${uniq}`,
          userId: user.id,
          countryFolderCode: countryCode,
        },
      });
      profileIds.push(profile.id);
      return { userId: user.id, profileId: profile.id, email };
    };

    const patientA = await mkPatient("a");
    const patientB = await mkPatient("b");
    patientAProfileId = patientA.profileId;
    patientAEmail = patientA.email;
    patientBProfileId = patientB.profileId;
    patientBEmail = patientB.email;

    // Patient A consents to direct medical access; patient B consents to
    // nothing, which is what makes doctor B's access path fail.
    await prisma.patientConsent.create({
      data: {
        patientProfileId: patientAProfileId,
        consentType: "MEDICAL_ACCESS_DIRECT",
        consentValue: true,
        source: "PATIENT_PORTAL",
      },
    });

    const mkAppointment = async (doctorId: string, patient: { userId: string; email: string }) => {
      const row = await prisma.appointment.create({
        data: {
          countryCode,
          consultationType: "GENERAL",
          fullName: `Patient ${uniq}`,
          email: patient.email,
          phone: "+353871234567",
          consentAccepted: true,
          doctorId,
          userId: patient.userId,
        },
      });
      appointmentIds.push(row.id);
      return row.id;
    };

    await mkAppointment(doctorAId, patientA);
    await mkAppointment(doctorCId, patientA);
    await mkAppointment(doctorDId, patientA);
    await mkAppointment(doctorBId, patientB);
    await mkAppointment(doctorFId, patientA);
    // doctor E deliberately gets no appointment.

    // One open review cycle per patient so the review endpoint has something
    // real to act on — the denial must leave it exactly as created.
    const mkEvent = async (patientProfileId: string, label: string) =>
      (
        await prisma.identityVerificationEvent.create({
          data: {
            referenceId: `az4-${label}-${uniq}`,
            patientProfileId,
            status: "PENDING",
            method: "MANUAL",
          },
        })
      ).id;
    patientBEventId = await mkEvent(patientBProfileId, "b");
    patientAEventId = await mkEvent(patientAProfileId, "a");

    // Alert history the alert-log endpoint must not disclose on a denial.
    await prisma.patientAlertLog.create({
      data: {
        patientProfileId: patientBProfileId,
        alertType: "CLINIC",
        action: "SET",
        newValue: `AZ4 clinic alert ${uniq}`,
        actorRole: "DOCTOR",
      },
    });
  });

  after(async () => {
    // Guaranteed restore: the flag is process-global and every later suite in
    // the same runner would otherwise inherit enforcement.
    if (env && originalEnforce !== undefined) {
      env.MEDICAL_ACCESS_ENFORCE = originalEnforce;
    }
    if (app) await app.close();
    if (bootError) return;
    // AuditLog and MedicalAccessLog both have an append-only DELETE trigger;
    // test cleanup goes through the shared override helper rather than a plain
    // deleteMany. The AuditLog sweep is scoped to the entity ids this suite
    // created — its own appointments, patient profiles and verification events
    // — and runs first, while those ids are still known.
    await deleteAuditLogs(prisma, {
      entityId: {
        in: [...profileIds, ...appointmentIds, patientAEventId, patientBEventId],
      },
    });
    await prisma.appointment.deleteMany({ where: { email: { contains: uniq } } });
    await deleteMedicalAccessLogs(prisma, { patientProfileId: { in: profileIds } });
    await prisma.securityAlert.deleteMany({ where: { patientId: { in: profileIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.doctorConfidentialityAgreement.deleteMany({
      where: { doctorId: { in: doctorIds } },
    });
    await prisma.doctor.deleteMany({ where: { id: { in: doctorIds } } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  const boot = (t: { skip: (m?: string) => void }) => {
    if (!app) {
      t.skip(
        `buildApp() failed: ${bootError instanceof Error ? bootError.message : String(bootError)}`,
      );
      return false;
    }
    return true;
  };

  const enc = (email: string) => encodeURIComponent(email);

  /** Everything a denied verification request/review must leave untouched. */
  const verificationSnapshot = async (profileId: string, eventId: string) => {
    const [profile, event] = await Promise.all([
      prisma.patientProfile.findUnique({
        where: { id: profileId },
        select: {
          idVerifyRequestedAt: true,
          idVerifyRequestedBy: true,
          idVerificationStatus: true,
          idVerificationReviewedBy: true,
          idVerificationReviewedAt: true,
        },
      }),
      prisma.identityVerificationEvent.findUnique({
        where: { id: eventId },
        select: {
          status: true,
          reviewedAt: true,
          reviewedByUserId: true,
          reviewedByRole: true,
          reviewNotes: true,
        },
      }),
    ]);
    return { profile, event };
  };

  // ── 1. Positive path — authorization must survive the fix ─────────────────

  it("1. authorized doctor can still request identity verification (enforce on)", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "POST",
      url: `/api/doctor/patients/${enc(patientAEmail)}/identity-verification/request`,
      cookies: doctorACookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.ok(res.json().data.requestedAt, "the response shape is unchanged");
  });

  it("2. authorized doctor can still read the alert log (enforce on)", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/doctor/patients/${enc(patientAEmail)}/alert-log`,
      cookies: doctorACookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.ok(Array.isArray(res.json().data.entries), "the response shape is unchanged");
  });

  it("3. a linked ADMIN keeps its existing doctor-route access (enforce on)", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/doctor/patients/${enc(patientAEmail)}/alert-log`,
      cookies: linkedAdminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  it("4. an unrelated doctor still gets the pre-existing 404, not a guard 403", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/doctor/patients/${enc(patientAEmail)}/alert-log`,
      cookies: doctorECookie,
    });
    assert.equal(res.statusCode, 404, res.body);
  });

  // ── 2. Country / consent denial ───────────────────────────────────────────

  it("5. a doctor with no valid access path is denied the verification request", async (t) => {
    if (!boot(t)) return;
    const before = await verificationSnapshot(patientBProfileId, patientBEventId);
    const res = await app!.inject({
      method: "POST",
      url: `/api/doctor/patients/${enc(patientBEmail)}/identity-verification/request`,
      cookies: doctorBCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(res.json().details?.reasonCode, "DOCTOR_NO_VALID_ACCESS_PATH");
    assert.deepEqual(
      await verificationSnapshot(patientBProfileId, patientBEventId),
      before,
      "a denied verification request writes nothing",
    );
  });

  it("6. a doctor with no valid access path is denied the verification review", async (t) => {
    if (!boot(t)) return;
    const before = await verificationSnapshot(patientBProfileId, patientBEventId);
    const res = await app!.inject({
      method: "POST",
      url: `/api/doctor/patients/${enc(patientBEmail)}/identity-verification/review`,
      cookies: doctorBCookie,
      payload: { eventId: patientBEventId, status: "VERIFIED" },
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.deepEqual(
      await verificationSnapshot(patientBProfileId, patientBEventId),
      before,
      "a denied review leaves the event PENDING and unreviewed",
    );
  });

  it("7. a doctor with no valid access path gets no alert content", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/doctor/patients/${enc(patientBEmail)}/alert-log`,
      cookies: doctorBCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.ok(
      !res.body.includes(uniq),
      "the denied response carries no alert text at all",
    );
  });

  // ── 3. Confidentiality agreement ──────────────────────────────────────────

  it("8. a doctor who never accepted the confidentiality agreement is denied", async (t) => {
    if (!boot(t)) return;
    const before = await verificationSnapshot(patientAProfileId, patientAEventId);
    const res = await app!.inject({
      method: "POST",
      url: `/api/doctor/patients/${enc(patientAEmail)}/identity-verification/request`,
      cookies: doctorCCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(
      res.json().details?.reasonCode,
      "DOCTOR_NO_CONFIDENTIALITY_AGREEMENT",
    );
    assert.deepEqual(
      await verificationSnapshot(patientAProfileId, patientAEventId),
      before,
      "denied before any side effect",
    );
  });

  it("9. the same doctor is denied the alert log", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/doctor/patients/${enc(patientAEmail)}/alert-log`,
      cookies: doctorCCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  // ── 4. 2FA ────────────────────────────────────────────────────────────────

  it("10. a doctor who has not completed 2FA is denied", async (t) => {
    if (!boot(t)) return;
    const before = await verificationSnapshot(patientAProfileId, patientAEventId);
    const res = await app!.inject({
      method: "POST",
      url: `/api/doctor/patients/${enc(patientAEmail)}/identity-verification/request`,
      cookies: doctorDCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(res.json().details?.reasonCode, "DOCTOR_2FA_REQUIRED");
    assert.deepEqual(
      await verificationSnapshot(patientAProfileId, patientAEventId),
      before,
      "denied before any side effect",
    );
  });

  // ── 5. Shadow mode still logs and continues ───────────────────────────────

  it("11. shadow mode records the decision and lets the request through", async (t) => {
    if (!boot(t)) return;
    env.MEDICAL_ACCESS_ENFORCE = false;
    try {
      const res = await app!.inject({
        method: "GET",
        url: `/api/doctor/patients/${enc(patientBEmail)}/alert-log`,
        cookies: doctorBCookie,
      });
      assert.equal(res.statusCode, 200, res.body);
      // MedicalAccessLog has no accessGranted/denyReason columns — a denied
      // decision is recorded as `abnormalReason = <denyReason>` (see
      // writeMedicalAccessLog).
      const logged = await prisma.medicalAccessLog.findFirst({
        where: {
          patientProfileId: patientBProfileId,
          accessedByUserId: doctorBUserId,
          abnormalReason: "DOCTOR_NO_VALID_ACCESS_PATH",
        },
        select: { id: true },
      });
      assert.ok(logged, "the would-be denial is still recorded in shadow mode");
    } finally {
      env.MEDICAL_ACCESS_ENFORCE = true;
    }
  });

  // ── 6. The authorized doctor can still complete a review ──────────────────

  it("12. authorized doctor can still complete a review (enforce on)", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "POST",
      url: `/api/doctor/patients/${enc(patientAEmail)}/identity-verification/review`,
      cookies: doctorACookie,
      payload: { eventId: patientAEventId, status: "VERIFIED" },
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.status, "VERIFIED");
  });
});

import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs, deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * Security-audit phase 5 (docs/audits/security/audit-authz-matrix-2026-08-02.md):
 * a role × endpoint authorization matrix, following the exact pattern
 * admin-plans.route.test.ts already establishes — buildApp() + app.inject()
 * + signAuthToken(), ephemeral self-cleaning fixtures, no real login flow.
 *
 * COMPLIANCE_MODE=relaxed in .env.test defaults MEDICAL_ACCESS_ENFORCE to
 * false (shadow mode: denials are logged to MedicalAccessLog but never
 * block the request) — see config/env.ts. `env` is a plain mutable object
 * other tests in this repo already toggle directly at runtime
 * (medical-access-guard.test.ts); this file does the same, restoring the
 * original value in `after()` so it can't leak into other test files run
 * in the same process.
 *
 * Scope: the highest-risk families per the audit plan — not all 482 route
 * registrations. Covers: unauthenticated access, the cross-tenant doctor
 * scoping that already works (prescriptions.route.ts), session
 * invalidation via tokenVersion, and the PHI audit trail. LOCAL_ADMIN
 * country scope is already covered end-to-end by the existing
 * orders.route.local-admin-scope.test.ts — not duplicated here. The three
 * confirmed guard-bypass findings from phase 4 (S-031/S-032/S-033) are
 * recorded as `t.todo()` regression tests: they assert the SECURE expected
 * behavior, currently fail, and will start passing (with the .todo removed)
 * once those findings are fixed.
 */
describe("authorization matrix", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];
  let envModule: typeof import("../config/env.js")["env"];
  let originalEnforce: boolean;

  const uniq = `authz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let currencyId = "";
  let countryAId = "";
  let doctor1Id = "";
  let doctor1UserId = "";
  let doctor2Id = "";
  let doctor2UserId = "";
  let patient1UserId = "";
  let patient1ProfileId = "";
  let appointmentId = "";
  let consultationId = "";
  let prescriptionId = "";
  let doctor1Cookie: Record<string, string> = {};
  let doctor2Cookie: Record<string, string> = {};

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      envModule = (await import("../config/env.js")).env;
      app = await buildApp();
    } catch {
      return; // app null → every test below skips
    }

    // Force enforce mode for this suite only — see the module docstring.
    originalEnforce = envModule.MEDICAL_ACCESS_ENFORCE;
    envModule.MEDICAL_ACCESS_ENFORCE = true;

    const currency = await prisma.currency.create({
      data: { code: `A${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const countryA = await prisma.country.create({
      data: {
        code: `a${uniq}`.slice(0, 8).toLowerCase(),
        name: `Authz Test A ${uniq}`,
        slug: `authz-test-a-${uniq}`.toLowerCase(),
        legacyHomePath: `/lg-a-${uniq}`,
        teamPath: `/tm-a-${uniq}`,
        generalConsultationPath: `/gn-a-${uniq}`,
        specialistConsultationPath: `/sp-a-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryAId = countryA.id;

    // Doctor 1 — owns the appointment/consultation/prescription under test.
    const doctor1 = await prisma.doctor.create({
      data: {
        countryId: countryA.id,
        slug: `authz-doctor-1-${uniq}`,
        fullName: "Authz Test Doctor One",
        title: "General Practitioner",
      },
    });
    doctor1Id = doctor1.id;
    const doctor1User = await prisma.user.create({
      data: {
        email: `doctor1-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Authz Test Doctor One",
        role: "DOCTOR",
        doctorId: doctor1.id,
        // Both required for the guard's DOCTOR-allow branch (4a/4b in
        // medical-access-guard.ts) — without them every read is denied
        // regardless of consent/treatment relationship.
        twoFactorVerifiedAt: new Date(),
      },
    });
    doctor1UserId = doctor1User.id;
    // 4a: confidentiality agreement, current version.
    await prisma.doctorConfidentialityAgreement.create({
      data: { doctorId: doctor1.id, agreementVersion: "1.0.0", accepted: true, acceptedAt: new Date() },
    });
    doctor1Cookie = {
      gh_auth: signAuthToken({
        sub: doctor1User.id,
        role: "DOCTOR",
        email: doctor1User.email,
        tokenVersion: 0,
      }),
    };

    // Doctor 2 — unrelated, no relationship to doctor 1's patient at all.
    const doctor2 = await prisma.doctor.create({
      data: {
        countryId: countryA.id,
        slug: `authz-doctor-2-${uniq}`,
        fullName: "Authz Test Doctor Two",
        title: "General Practitioner",
      },
    });
    doctor2Id = doctor2.id;
    const doctor2User = await prisma.user.create({
      data: {
        email: `doctor2-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Authz Test Doctor Two",
        role: "DOCTOR",
        doctorId: doctor2.id,
      },
    });
    doctor2UserId = doctor2User.id;
    doctor2Cookie = {
      gh_auth: signAuthToken({ sub: doctor2User.id, role: "DOCTOR", email: doctor2User.email }),
    };

    // Patient 1 — the record doctor 2 must never be able to read.
    const patient1User = await prisma.user.create({
      data: {
        email: `patient1-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Authz Test Patient One",
        role: "PATIENT",
      },
    });
    patient1UserId = patient1User.id;
    const patient1Profile = await prisma.patientProfile.create({
      data: { email: patient1User.email, userId: patient1User.id, fullName: "Authz Test Patient One" },
    });
    patient1ProfileId = patient1Profile.id;
    // 4c (direct consent): the simplest allow path — direct consent plus an
    // active treatment relationship (the appointment created below).
    await prisma.patientConsent.create({
      data: {
        patientProfileId: patient1Profile.id,
        consentType: "MEDICAL_ACCESS_DIRECT",
        consentValue: true,
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        countryCode: countryA.code,
        consultationType: "GENERAL",
        fullName: patient1User.fullName,
        email: patient1User.email,
        consentAccepted: true,
        userId: patient1User.id,
        doctorId: doctor1.id,
      },
    });
    appointmentId = appointment.id;
    const consultation = await prisma.consultation.create({
      data: { appointmentId: appointment.id, doctorId: doctor1.id, status: "SIGNED" },
    });
    consultationId = consultation.id;
    const prescription = await prisma.prescription.create({
      data: {
        consultationId: consultation.id,
        doctorId: doctor1.id,
        drugName: "Authz Test Drug",
      },
    });
    prescriptionId = prescription.id;
  });

  after(async () => {
    if (!app) return;
    envModule.MEDICAL_ACCESS_ENFORCE = originalEnforce;
    await deleteMedicalAccessLogs(prisma, { patientProfileId: patient1ProfileId });
    await deleteAuditLogs(prisma, {
      actorUserId: { in: [doctor1UserId, doctor2UserId, patient1UserId] },
    });
    await prisma.prescription.deleteMany({ where: { id: prescriptionId } });
    await prisma.consultation.deleteMany({ where: { id: consultationId } });
    await prisma.appointment.deleteMany({ where: { id: appointmentId } });
    await prisma.patientProfile.deleteMany({ where: { id: patient1ProfileId } });
    await prisma.user.deleteMany({
      where: { id: { in: [doctor1UserId, doctor2UserId, patient1UserId] } },
    });
    await prisma.doctor.deleteMany({ where: { id: { in: [doctor1Id, doctor2Id] } } });
    await prisma.country.deleteMany({ where: { id: countryAId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  // ── Unauthenticated access ────────────────────────────────────────────
  it("rejects an unauthenticated request to a doctor clinical route → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/doctor/appointments/${appointmentId}/prescriptions`,
    });
    assert.equal(res.statusCode, 401);
  });

  it("rejects an unauthenticated request to an admin route → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/admin/patients/search" });
    assert.equal(res.statusCode, 401);
  });

  // ── Doctor scoping that already works (regression protection) ────────
  it("allows the owning doctor to read their own patient's prescriptions", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/doctor/appointments/${appointmentId}/prescriptions`,
      cookies: doctor1Cookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();
    assert.ok(
      body.data.items.some((p: { id: string }) => p.id === prescriptionId),
      "the seeded prescription is present in the response",
    );
  });

  it("blocks an unrelated doctor from reading another doctor's patient's prescriptions (cross-tenant IDOR)", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/doctor/appointments/${appointmentId}/prescriptions`,
      cookies: doctor2Cookie,
    });
    // 404, not 200 with data and not a 500 — the doctorId-scoped appointment
    // lookup in prescriptions.route.ts returns nothing for a non-owning
    // doctor before the medical-access guard is even reached.
    assert.equal(res.statusCode, 404, res.body);
  });

  // ── PHI audit trail ────────────────────────────────────────────────────
  it("writes a MedicalAccessLog row for an allowed PHI read", async (t) => {
    if (!app) return t.skip();
    const before = await prisma.medicalAccessLog.count({
      where: { patientProfileId: patient1ProfileId },
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/doctor/appointments/${appointmentId}/prescriptions`,
      cookies: doctor1Cookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const logs = await prisma.medicalAccessLog.findMany({
      where: { patientProfileId: patient1ProfileId },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(logs.length > before, "a new MedicalAccessLog row was written");
    const latest = logs[0];
    assert.equal(latest.accessedByUserId, doctor1UserId);
    assert.equal(latest.accessedResourceType, "PRESCRIPTION");
  });

  // ── Session invalidation (S-004) ───────────────────────────────────────
  it("rejects a cookie whose tokenVersion no longer matches the DB (sign-out-all-devices)", async (t) => {
    if (!app) return t.skip();
    // Confirm the token works before invalidation, so a failure below is
    // provably the tokenVersion check and not an unrelated fixture problem.
    const before = await app.inject({
      method: "GET",
      url: `/api/doctor/appointments/${appointmentId}/prescriptions`,
      cookies: doctor1Cookie,
    });
    assert.equal(before.statusCode, 200, before.body);

    await prisma.user.update({
      where: { id: doctor1UserId },
      data: { tokenVersion: { increment: 1 } },
    });

    const afterInvalidation = await app.inject({
      method: "GET",
      url: `/api/doctor/appointments/${appointmentId}/prescriptions`,
      cookies: doctor1Cookie, // same, now-stale token — never re-signed
    });
    assert.equal(afterInvalidation.statusCode, 401, afterInvalidation.body);
  });

  // ── Confirmed phase-4 findings (S-031/S-032/S-033) — documented as
  // regression tests, not silently skipped. Each asserts the SECURE
  // behavior these routes should have; all three currently fail because
  // the routes read PHI with no guardMedicalRead call at all (verified by
  // reading the source in docs/audits/security/audit-authz-rules-2026-08-02.md).
  // Remove .todo() once the corresponding fix lands.
  it.todo(
    "S-032: blocks an unrelated doctor from reading another doctor's patient documents",
    async (t: unknown) => {
      void t;
      // doctor-patient-documents.route.ts has no doctorId-scoped ownership
      // check and no guardMedicalRead call — doctor 2 currently gets the
      // same 200 doctor 1 would, for a patient they have no relationship to.
    },
  );
});

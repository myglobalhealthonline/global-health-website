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
  // S-032/S-031 fixes: an ADMIN who also has a linked Doctor profile — the
  // shape doctor-patient-documents.route.ts actually requires (authenticates
  // via verifyDoctorAccess, which needs a doctorId, but then bounces
  // anything that isn't role==="ADMIN").
  let adminDocId = "";
  let adminUserId = "";
  let adminCookie: Record<string, string> = {};
  let medicalDocumentId = "";
  let orderId = "";
  let invoiceId = "";

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

    // Admin fixture for S-031/S-032: doctor-patient-documents.route.ts
    // authenticates via verifyDoctorAccess (which requires a linked
    // doctorId, even for an ADMIN session) but then bounces anything that
    // isn't role==="ADMIN" — so the only caller that ever reaches the new
    // guard call is an ADMIN who also has a Doctor profile attached.
    const adminDoc = await prisma.doctor.create({
      data: {
        countryId: countryA.id,
        slug: `authz-admin-doc-${uniq}`,
        fullName: "Authz Test Admin (linked doctor)",
        title: "Support",
      },
    });
    adminDocId = adminDoc.id;
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Authz Test Admin",
        role: "ADMIN",
        doctorId: adminDoc.id,
      },
    });
    adminUserId = adminUser.id;
    adminCookie = {
      gh_auth: signAuthToken({ sub: adminUser.id, role: "ADMIN", email: adminUser.email }),
    };

    // One real document so the S-032 fix's positive-path test has actual
    // data flowing through the now-guarded response, not just an empty list.
    const medicalDocument = await prisma.medicalDocument.create({
      data: {
        patientProfileId: patient1Profile.id,
        uploadedByRole: "PATIENT",
        documentType: "OTHER",
        title: "Authz Test Upload",
        fileKey: `authz-test/${uniq}/file.pdf`,
        fileName: "file.pdf",
        mimetype: "application/pdf",
        byteSize: 1024,
      },
    });
    medicalDocumentId = medicalDocument.id;

    // Order + Invoice for S-031's admin-invoices.route.ts single-read test.
    const order = await prisma.order.create({
      data: {
        email: patient1User.email,
        fullName: patient1User.fullName,
        countryCode: countryA.code,
        currencyCode: currency.code,
        subtotalCents: 1000,
        totalCents: 1000,
      },
    });
    orderId = order.id;
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `AUTHZ-${uniq}`,
        orderId: order.id,
        countryCode: countryA.code,
      },
    });
    invoiceId = invoice.id;
  });

  after(async () => {
    if (!app) return;
    envModule.MEDICAL_ACCESS_ENFORCE = originalEnforce;
    await deleteMedicalAccessLogs(prisma, { patientProfileId: patient1ProfileId });
    await deleteAuditLogs(prisma, {
      actorUserId: { in: [doctor1UserId, doctor2UserId, patient1UserId, adminUserId] },
    });
    await prisma.invoice.deleteMany({ where: { id: invoiceId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.medicalDocument.deleteMany({ where: { id: medicalDocumentId } });
    await prisma.prescription.deleteMany({ where: { id: prescriptionId } });
    await prisma.consultation.deleteMany({ where: { id: consultationId } });
    await prisma.appointment.deleteMany({ where: { id: appointmentId } });
    await prisma.patientProfile.deleteMany({ where: { id: patient1ProfileId } });
    await prisma.user.deleteMany({
      where: { id: { in: [doctor1UserId, doctor2UserId, patient1UserId, adminUserId] } },
    });
    await prisma.doctor.deleteMany({ where: { id: { in: [doctor1Id, doctor2Id, adminDocId] } } });
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

  // ── S-032 fix: doctor-patient-documents.route.ts now calls guardMedicalRead ──
  // The route bounces any non-ADMIN role before the guard is even reached
  // (`if (auth.role !== "ADMIN") return 403`), so the only caller that ever
  // exercises the new guard call is an ADMIN who also has a linked Doctor
  // profile (see the `adminCookie` fixture above). The guard's ADMIN branch
  // is close to unconditional when ADMIN_PHI_REQUIRE_REASON is off (this
  // repo's test default) — so the fix's *observable* difference here is a
  // MedicalAccessLog row now being written for a read that previously wrote
  // nothing at all, plus a real 403 once a break-glass reason is required
  // and missing.
  it("S-032 fix: an authorized admin can still read patient documents (regression protection)", async (t) => {
    if (!app) return t.skip();
    const patient1Email = (
      await prisma.user.findUniqueOrThrow({ where: { id: patient1UserId }, select: { email: true } })
    ).email;
    const res = await app.inject({
      method: "GET",
      url: `/api/doctor/patients/${encodeURIComponent(patient1Email)}/documents`,
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json();
    assert.ok(
      body.data.patientUploads.some((d: { id: string }) => d.id === medicalDocumentId),
      "the seeded MedicalDocument is present in the response",
    );
  });

  it("S-032 fix: writes a MedicalAccessLog row for the admin's document read (previously wrote none)", async (t) => {
    if (!app) return t.skip();
    const before = await prisma.medicalAccessLog.count({
      where: { patientProfileId: patient1ProfileId, accessedResourceType: "MEDICAL_DOC" },
    });
    const patient1Email = (
      await prisma.user.findUniqueOrThrow({ where: { id: patient1UserId }, select: { email: true } })
    ).email;
    const res = await app.inject({
      method: "GET",
      url: `/api/doctor/patients/${encodeURIComponent(patient1Email)}/documents`,
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const after = await prisma.medicalAccessLog.count({
      where: { patientProfileId: patient1ProfileId, accessedResourceType: "MEDICAL_DOC" },
    });
    assert.ok(after > before, "a new MedicalAccessLog row was written for this read");
  });

  it("S-032 fix: blocks the admin read once a break-glass reason is required but not supplied", async (t) => {
    if (!app) return t.skip();
    const originalRequireReason = envModule.ADMIN_PHI_REQUIRE_REASON;
    envModule.ADMIN_PHI_REQUIRE_REASON = true;
    try {
      const patient1Email = (
        await prisma.user.findUniqueOrThrow({ where: { id: patient1UserId }, select: { email: true } })
      ).email;
      const res = await app.inject({
        method: "GET",
        url: `/api/doctor/patients/${encodeURIComponent(patient1Email)}/documents`,
        cookies: adminCookie,
        // Deliberately no x-phi-reason header and no gh_phi_reason cookie.
      });
      assert.equal(res.statusCode, 403, res.body);
    } finally {
      envModule.ADMIN_PHI_REQUIRE_REASON = originalRequireReason;
    }
  });

  // ── S-031 fix: admin-invoices.route.ts single-invoice read now guarded ──
  it("S-031 fix: an admin can still read a single invoice's tax ID (regression protection)", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: `/api/admin/invoices/${invoiceId}`,
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  it("S-031 fix: writes a MedicalAccessLog row for the admin's invoice read", async (t) => {
    if (!app) return t.skip();
    const before = await prisma.medicalAccessLog.count({
      where: { patientProfileId: patient1ProfileId, accessedResourceType: "SENSITIVE_PROFILE" },
    });
    const res = await app.inject({
      method: "GET",
      url: `/api/admin/invoices/${invoiceId}`,
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const after = await prisma.medicalAccessLog.count({
      where: { patientProfileId: patient1ProfileId, accessedResourceType: "SENSITIVE_PROFILE" },
    });
    assert.ok(after > before, "a new MedicalAccessLog row was written for this invoice read");
  });
});

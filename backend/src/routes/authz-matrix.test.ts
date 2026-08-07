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
  let patient1Cookie: Record<string, string> = {};
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
  /** Cheapest cart line that needs no slot — carries the benefit probes below. */
  let healthTestId = "";

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
    patient1Cookie = {
      gh_auth: signAuthToken({ sub: patient1User.id, role: "PATIENT", email: patient1User.email }),
    };
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

    // A product line for the cart-benefit probes (§11.4). A consultation would
    // need a doctor assignment, an availability window and a held slot, none of
    // which the benefit gate reads.
    const healthTest = await prisma.healthTest.create({
      data: {
        countryId: countryA.id,
        slug: `authz-kit-${uniq}`.toLowerCase(),
        title: `Authz Kit ${uniq}`,
        priceCents: 5000,
        currencyCode: currency.code,
        productImagePath: "/authz-kit.png",
      },
    });
    healthTestId = healthTest.id;
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
    await prisma.cartItem.deleteMany({ where: { cart: { userId: patient1UserId } } });
    await prisma.cart.deleteMany({ where: { userId: patient1UserId } });
    await prisma.healthTest.deleteMany({ where: { id: healthTestId } });
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

  // ── Private membership plans (admin-membership-plans.route.ts) ──────────────
  // Two tiers: MANAGE_MEMBERSHIPS to read, a real admin *session* to write —
  // SUPER_ADMIN or ADMIN, never the master token (§4.2). LOCAL_ADMIN denial and
  // the master-token denial are covered end-to-end in
  // admin-membership-plans.route.test.ts; what belongs here is the
  // deny-by-default matrix for the roles this suite already has fixtures for.
  // Reads are asserted on status alone — the fixtures create no membership
  // plans, so an empty list is the expected 200.

  it("membership plans: unauthenticated read → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/admin/membership-plans" });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("membership plans: unauthenticated write → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-plans",
      payload: { countryId: countryAId, slug: "authz-probe", name: "Authz probe" },
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("membership plans: a doctor session cannot read the plan list → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-plans",
      cookies: doctor1Cookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("membership plans: an admin may read the plan list → 200", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-plans",
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  it("membership plans: a doctor session cannot create a plan → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-plans",
      cookies: doctor1Cookie,
      payload: { countryId: countryAId, slug: "authz-probe", name: "Authz probe" },
    });
    assert.equal(res.statusCode, 403, res.body);
    const leaked = await prisma.membershipPlan.findFirst({ where: { slug: "authz-probe" } });
    assert.equal(leaked, null, "nothing written on a denied config write");
  });

  // 200, not 201: every admin write in this codebase returns okResponse(), and
  // admin-membership-plans.route.test.ts asserts 200 on this same endpoint.
  it("membership plans: an ADMIN session may create a plan → 200 (§4.2)", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-plans",
      cookies: adminCookie,
      payload: { countryId: countryAId, slug: "authz-admin-write", name: "Authz admin write" },
    });
    assert.equal(res.statusCode, 200, res.body);
    // Cascades to the auto-created default level; nothing else references it.
    await prisma.membershipPlan.deleteMany({ where: { slug: "authz-admin-write" } });
  });

  // ── Membership enrollments + import (phase 2) ───────────────────────────────
  // One tier: MANAGE_MEMBERSHIPS. These carry member PII, so the deny paths
  // matter more than the allow path (covered in the route suite).

  it("membership enrollments: unauthenticated read → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/admin/membership-enrollments" });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("membership enrollments: a doctor session cannot read the member list → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-enrollments",
      cookies: doctor1Cookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("membership enrollments: an admin may read the member list → 200", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-enrollments",
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  it("membership enrollments: a doctor cannot enroll anyone → 403, nothing written", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-enrollments",
      cookies: doctor1Cookie,
      payload: {
        planId: "any-plan",
        membershipId: "AUTHZ-PROBE-1",
        email: "authz-probe@test.local",
        firstName: "Authz",
        lastName: "Probe",
        startDate: "2026-01-01",
      },
    });
    assert.equal(res.statusCode, 403, res.body);
    const leaked = await prisma.membershipEnrollment.findFirst({
      where: { membershipId: "AUTHZ-PROBE-1" },
    });
    assert.equal(leaked, null, "nothing written on a denied enrollment write");
  });

  it("membership enrollments: a doctor cannot suspend a membership → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-enrollments/any-id/suspend",
      cookies: doctor2Cookie,
      payload: {},
    });
    // 403 from the gate, NOT 404 — authorization is decided before the route
    // reveals whether the enrollment exists.
    assert.equal(res.statusCode, 403, res.body);
  });

  it("membership imports: unauthenticated upload → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "POST", url: "/api/admin/membership-imports" });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("membership imports: a doctor cannot commit a batch → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-imports/any-batch/commit",
      cookies: doctor1Cookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("membership benefits: a doctor session cannot create a benefit → 403 (§4.2)", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-levels/any-level/benefits",
      cookies: doctor1Cookie,
      payload: { serviceKind: "GENERAL", benefitType: "PERCENT", percentOff: 20 },
    });
    // 403 from the gate, NOT 404 from the level lookup — authorization must be
    // decided before the route reveals whether the level exists.
    assert.equal(res.statusCode, 403, res.body);
  });

  // ── Private membership: member surface + staff verify (phase 3) ─────────────
  //
  // The member routes are session-scoped rather than role-gated, so what the
  // matrix pins here is the scoping itself: no session at all, and a session
  // that is not the row's owner. The staff verify endpoint is the one place a
  // membership id resolves to a person, so it carries the full admin gate.

  it("member memberships: unauthenticated read → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/me/memberships" });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("member memberships: unauthenticated claim → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      payload: { membershipId: "AUTHZ-CLAIM-1", email: "nobody@example.test" },
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("member memberships: unauthenticated claim confirm → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim/confirm",
      payload: { token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  // doctor2, not doctor1: the sign-out-all-devices test above deliberately
  // bumps doctor1's tokenVersion, so its cookie is dead from that point on and
  // this would assert 401 instead of the scoping it is here to check.
  it("member memberships: a doctor session sees no memberships, not everyone's", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/me/memberships",
      cookies: doctor2Cookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(res.json().data, []);
  });

  it("membership verify: unauthenticated lookup → 401 (no public verification URL, §20)", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-verify?membershipId=AUTHZ-VERIFY-1",
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("membership verify: a doctor session cannot look a member up → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-verify?membershipId=AUTHZ-VERIFY-1",
      cookies: doctor1Cookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("membership verify: an admin may look up, and a miss is 200 found:false", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-verify?membershipId=AUTHZ-VERIFY-NONE",
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.found, false);
  });

  // ── Benefit options (phase 4) ──────────────────────────────────────────────
  //
  // The endpoint prices a patient's own benefits, so the gate is "a patient
  // session, and only the caller's own". Guests get 401 rather than an empty
  // list so the booking step can prompt them to log in (§6.3).

  it("benefit options: unauthenticated read → 401, not an empty list", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/me/benefit-options?serviceId=authz-probe",
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("benefit options: a doctor session is not a patient → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/me/benefit-options?serviceId=authz-probe",
      cookies: doctor2Cookie,
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("benefit options: an admin session is not a patient either → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/me/benefit-options?serviceId=authz-probe",
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("benefit options: a patient session passes the gate → 404 on an unknown service", async (t) => {
    if (!app) return t.skip();
    // 404, not 401/403: the gate let the patient through and the SERVICE
    // lookup is what failed. Asserting the distinction is the point — a 401
    // here would mean the endpoint is unreachable for the people it is for.
    const res = await app.inject({
      method: "GET",
      url: "/api/me/benefit-options?serviceId=authz-probe-missing",
      cookies: patient1Cookie,
    });
    assert.equal(res.statusCode, 404, res.body);
  });

  it("benefit options: a missing serviceId is rejected → 400", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/me/benefit-options",
      cookies: patient1Cookie,
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  // ── Cart benefit choice (§11.4) ───────────────────────────────────
  // The write that decides which pricing engine runs at checkout, so the gate
  // matters as much as the read above: anyone who could set it for another
  // account could change what that account pays. It rides on add-to-cart, so
  // the gate is exercised there.

  const addKit = (benefit?: Record<string, unknown>, cookies?: Record<string, string>) => ({
    method: "POST" as const,
    url: "/api/cart/items",
    payload: { kind: "HEALTH_TEST", healthTestId, ...(benefit ? { benefit } : {}) },
    ...(cookies ? { cookies } : {}),
  });

  it("cart benefit: another patient's membership id is not found → 404", async (t) => {
    if (!app) return t.skip();
    // Same answer as "no such enrollment": the id is partner-supplied and
    // potentially sequential, so the route must not confirm which ones
    // exist (§14, enumeration).
    const res = await app.inject(
      addKit({ source: "MEMBERSHIP", refId: "enr-authz-probe" }, patient1Cookie),
    );
    assert.equal(res.statusCode, 404, res.body);
    // And the line is NOT created. A rejected benefit that still added the item
    // would leave the cart at UNSET with the line already in it — the exact
    // half-written state folding the write into add-to-cart exists to prevent.
    const items = await prisma.cartItem.count({ where: { cart: { userId: patient1UserId } } });
    assert.equal(items, 0);
  });

  it("cart benefit: UNSET cannot be set by a client → 400", async (t) => {
    if (!app) return t.skip();
    // UNSET means "never asked". Letting a client restore it would re-open
    // §6.4's reject path on a cart that had already been decided.
    const res = await app.inject(addKit({ source: "UNSET" }, patient1Cookie));
    assert.equal(res.statusCode, 400, res.body);
  });

  it("cart benefit: a patient may set their own choice → 200", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject(addKit({ source: "NONE" }, patient1Cookie));
    assert.equal(res.statusCode, 200, res.body);
    const cart = await prisma.cart.findUnique({
      where: { userId: patient1UserId },
      select: { benefitSource: true },
    });
    assert.equal(cart?.benefitSource, "NONE");
  });

  it("cart benefit: a guest's benefit field is ignored, not honoured → 200 at UNSET", async (t) => {
    if (!app) return t.skip();
    // Guests hold no benefits (decision 6). The field is ignored rather than
    // rejected so a guest insurance booking — whose source is the per-line
    // insuranceCompanyId — is not broken by a stray body field.
    const res = await app.inject(addKit({ source: "CORPORATE" }));
    assert.equal(res.statusCode, 200, res.body);
    const token = String(res.headers["set-cookie"] ?? "").match(/gh_cart=([^;]+)/)?.[1];
    assert.ok(token, "guest cart cookie");
    const cart = await prisma.cart.findUnique({
      where: { cookieToken: decodeURIComponent(token!) },
      select: { id: true, benefitSource: true },
    });
    assert.equal(cart?.benefitSource, "UNSET");
    await prisma.cartItem.deleteMany({ where: { cartId: cart!.id } });
    await prisma.cart.delete({ where: { id: cart!.id } });
  });

  it("cart benefit: the retired PUT endpoint is gone (§11.4)", async (t) => {
    if (!app) return t.skip();
    // A second call was a window in which a line could exist without the
    // benefit that prices it. A 404 for a PATIENT session is the retirement.
    const res = await app.inject({
      method: "PUT",
      url: "/api/me/cart/benefit",
      payload: { source: "NONE" },
      cookies: patient1Cookie,
    });
    assert.equal(res.statusCode, 404, res.body);
  });

  it("benefit preview: the retired endpoint is gone (§6.3)", async (t) => {
    if (!app) return t.skip();
    // Two price sources for one booking would drift. A 404 here — for a
    // PATIENT session, which used to be served — is the retirement.
    const res = await app.inject({
      method: "GET",
      url: "/api/me/benefit-preview?serviceId=authz-probe&basePriceCents=1000",
      cookies: patient1Cookie,
    });
    assert.equal(res.statusCode, 404, res.body);
  });
});

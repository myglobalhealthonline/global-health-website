import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs, deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

type InjectStatusResponse = { statusCode: number; body: string };

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

  const currencyCode = uniqueCurrencyCode();
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
  let pauseServiceId = "";
  // Write-guard fixtures (§ write-path regression): doctor3 owns appointment2
  // for patient2, but patient2 has granted NO consent of any kind — the
  // guard's 4g "all doctor checks failed" path. Doctor3 passes the route's
  // own doctorId-scoped appointment lookup (so it reaches the guard call at
  // all) but must still be denied by assertMedicalAccess.
  let doctor3Id = "";
  let doctor3UserId = "";
  let doctor3Cookie: Record<string, string> = {};
  let patient2UserId = "";
  let patient2ProfileId = "";
  let appointment2Id = "";
  let consultation2Id = "";
  let prescription2Id = "";

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
      data: { code: currencyCode, symbol: "€", decimals: 2 },
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

    const pauseService = await prisma.service.create({
      data: {
        countryId: countryA.id,
        slug: `authz-pause-service-${uniq}`.toLowerCase(),
        name: "Authz Pause Service",
      },
    });
    pauseServiceId = pauseService.id;

    // Write-guard fixtures: doctor3 has 2FA + confidentiality (passes 4a/4b)
    // and owns appointment2 (so the route's own doctorId-scoped lookup
    // succeeds and the request reaches the guard call), but patient2 has
    // granted no consent of any kind and no other doctor has ever treated
    // them — the guard must deny with DOCTOR_NO_VALID_ACCESS_PATH.
    const doctor3 = await prisma.doctor.create({
      data: {
        countryId: countryA.id,
        slug: `authz-doctor-3-${uniq}`,
        fullName: "Authz Test Doctor Three",
        title: "General Practitioner",
      },
    });
    doctor3Id = doctor3.id;
    const doctor3User = await prisma.user.create({
      data: {
        email: `doctor3-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Authz Test Doctor Three",
        role: "DOCTOR",
        doctorId: doctor3.id,
        twoFactorVerifiedAt: new Date(),
      },
    });
    doctor3UserId = doctor3User.id;
    await prisma.doctorConfidentialityAgreement.create({
      data: { doctorId: doctor3.id, agreementVersion: "1.0.0", accepted: true, acceptedAt: new Date() },
    });
    doctor3Cookie = {
      gh_auth: signAuthToken({ sub: doctor3User.id, role: "DOCTOR", email: doctor3User.email }),
    };

    const patient2User = await prisma.user.create({
      data: {
        email: `patient2-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Authz Test Patient Two",
        role: "PATIENT",
      },
    });
    patient2UserId = patient2User.id;
    const patient2Profile = await prisma.patientProfile.create({
      data: { email: patient2User.email, userId: patient2User.id, fullName: "Authz Test Patient Two" },
    });
    patient2ProfileId = patient2Profile.id;
    // Deliberately NO PatientConsent row created for patient2.

    const appointment2 = await prisma.appointment.create({
      data: {
        countryCode: countryA.code,
        consultationType: "GENERAL",
        fullName: patient2User.fullName,
        email: patient2User.email,
        consentAccepted: true,
        userId: patient2User.id,
        doctorId: doctor3.id,
      },
    });
    appointment2Id = appointment2.id;
    const consultation2 = await prisma.consultation.create({
      data: { appointmentId: appointment2.id, doctorId: doctor3.id, status: "DRAFT" },
    });
    consultation2Id = consultation2.id;
    // Seeded directly (not via the guarded POST) so the DELETE write-guard
    // test below has something to attempt deleting.
    const prescription2 = await prisma.prescription.create({
      data: { consultationId: consultation2.id, doctorId: doctor3.id, drugName: "Authz Seed Drug" },
    });
    prescription2Id = prescription2.id;
  });

  after(async () => {
    // §24.3 — this matrix hits membership endpoints that can issue a card, and
    // a card is a Chromium render. A no-op when none was triggered.
    await (
      await import("../modules/generated-documents/html-document-renderer.js")
    ).closeSharedBrowser();
    if (!app) return;
    envModule.MEDICAL_ACCESS_ENFORCE = originalEnforce;
    await deleteMedicalAccessLogs(prisma, {
      patientProfileId: { in: [patient1ProfileId, patient2ProfileId] },
    });
    await deleteAuditLogs(prisma, {
      actorUserId: {
        in: [doctor1UserId, doctor2UserId, doctor3UserId, patient1UserId, patient2UserId, adminUserId],
      },
    });
    await prisma.invoice.deleteMany({ where: { id: invoiceId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: patient1UserId } } });
    await prisma.cart.deleteMany({ where: { userId: patient1UserId } });
    await prisma.healthTest.deleteMany({ where: { id: healthTestId } });
    await prisma.service.deleteMany({ where: { id: pauseServiceId } });
    await prisma.medicalDocument.deleteMany({ where: { id: medicalDocumentId } });
    await prisma.prescription.deleteMany({ where: { id: prescriptionId } });
    await prisma.consultationService.deleteMany({ where: { consultationId: consultation2Id } });
    await prisma.examResult.deleteMany({ where: { appointmentId: appointment2Id } });
    await prisma.medicalNote.deleteMany({ where: { appointmentId: appointment2Id } }).catch(() => {});
    await prisma.consultation.deleteMany({ where: { id: { in: [consultationId, consultation2Id] } } });
    await prisma.appointment.deleteMany({ where: { id: { in: [appointmentId, appointment2Id] } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: [patient1ProfileId, patient2ProfileId] } } });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [doctor1UserId, doctor2UserId, doctor3UserId, patient1UserId, patient2UserId, adminUserId],
        },
      },
    });
    await prisma.doctor.deleteMany({ where: { id: { in: [doctor1Id, doctor2Id, doctor3Id, adminDocId] } } });
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

  // ── Booking-pause management ──────────────────────────────────────────
  // Every new mutation is represented here. Admin endpoints must reject
  // doctors before parsing or touching a target; self-service endpoints must
  // reject patients and scope an authenticated doctor to their linked profile.
  const pausePayload = {
    from: "2026-09-01T08:00:00.000Z",
    until: "2026-09-08T08:00:00.000Z",
    reasonCode: "LEAVE",
  };

  it("admin booking pauses: unauthenticated requests to all four mutations → 401", async (t) => {
    if (!app) return t.skip();
    const targets = [
      ["PATCH", `/api/admin/doctors/${doctor2Id}/booking-pause`],
      ["DELETE", `/api/admin/doctors/${doctor2Id}/booking-pause`],
      ["PATCH", `/api/admin/services/${pauseServiceId}/booking-pause`],
      ["DELETE", `/api/admin/services/${pauseServiceId}/booking-pause`],
    ] as const;
    for (const [method, url] of targets) {
      const res: InjectStatusResponse = await app.inject({
        method,
        url,
        ...(method === "PATCH" ? { payload: pausePayload } : {}),
      });
      assert.equal(res.statusCode, 401, `${method} ${url}: ${res.body}`);
    }
  });

  it("doctor booking pause: unauthenticated PATCH and DELETE → 401", async (t) => {
    if (!app) return t.skip();
    for (const method of ["PATCH", "DELETE"] as const) {
      const res: InjectStatusResponse = await app.inject({
        method,
        url: "/api/doctor/booking-pause",
        ...(method === "PATCH" ? { payload: pausePayload } : {}),
      });
      assert.equal(res.statusCode, 401, `${method}: ${res.body}`);
    }
  });

  it("doctor booking pause: a patient cannot PATCH or DELETE → 403", async (t) => {
    if (!app) return t.skip();
    for (const method of ["PATCH", "DELETE"] as const) {
      const res: InjectStatusResponse = await app.inject({
        method,
        url: "/api/doctor/booking-pause",
        cookies: patient1Cookie,
        ...(method === "PATCH" ? { payload: pausePayload } : {}),
      });
      assert.equal(res.statusCode, 403, `${method}: ${res.body}`);
    }
  });

  it("doctor booking pause: a doctor can set and clear only their own pause", async (t) => {
    if (!app) return t.skip();
    const editorialUpdatedAt = (
      await prisma.doctor.findUniqueOrThrow({ where: { id: doctor2Id }, select: { updatedAt: true } })
    ).updatedAt;
    const set = await app.inject({
      method: "PATCH",
      url: "/api/doctor/booking-pause",
      cookies: doctor2Cookie,
      payload: pausePayload,
    });
    assert.equal(set.statusCode, 200, set.body);
    const paused = await prisma.doctor.findUniqueOrThrow({ where: { id: doctor2Id } });
    assert.equal(paused.bookingPausedFrom?.toISOString(), pausePayload.from);
    assert.equal(
      paused.updatedAt.toISOString(),
      editorialUpdatedAt.toISOString(),
      "operational pause did not synthesize a doctor sitemap lastmod",
    );
    assert.equal(
      (await prisma.doctor.findUniqueOrThrow({ where: { id: doctor1Id } })).bookingPausedFrom,
      null,
      "self-service mutation did not affect another doctor",
    );

    const clear = await app.inject({
      method: "DELETE",
      url: "/api/doctor/booking-pause",
      cookies: doctor2Cookie,
    });
    assert.equal(clear.statusCode, 200, clear.body);
    assert.equal(
      (await prisma.doctor.findUniqueOrThrow({ where: { id: doctor2Id } })).bookingPausedFrom,
      null,
    );
  });

  it("admin doctor booking pause: a doctor cannot PATCH or DELETE → 403", async (t) => {
    if (!app) return t.skip();
    for (const method of ["PATCH", "DELETE"] as const) {
      const res: InjectStatusResponse = await app.inject({
        method,
        url: `/api/admin/doctors/${doctor2Id}/booking-pause`,
        cookies: doctor2Cookie,
        ...(method === "PATCH" ? { payload: pausePayload } : {}),
      });
      assert.equal(res.statusCode, 403, `${method}: ${res.body}`);
    }
  });

  it("admin doctor booking pause: an admin can PATCH and DELETE", async (t) => {
    if (!app) return t.skip();
    const editorialUpdatedAt = (
      await prisma.doctor.findUniqueOrThrow({ where: { id: doctor2Id }, select: { updatedAt: true } })
    ).updatedAt;
    const set = await app.inject({
      method: "PATCH",
      url: `/api/admin/doctors/${doctor2Id}/booking-pause`,
      cookies: adminCookie,
      payload: pausePayload,
    });
    assert.equal(set.statusCode, 200, set.body);
    const clear = await app.inject({
      method: "DELETE",
      url: `/api/admin/doctors/${doctor2Id}/booking-pause`,
      cookies: adminCookie,
    });
    assert.equal(clear.statusCode, 200, clear.body);
    assert.equal(
      (
        await prisma.doctor.findUniqueOrThrow({ where: { id: doctor2Id }, select: { updatedAt: true } })
      ).updatedAt.toISOString(),
      editorialUpdatedAt.toISOString(),
      "admin pause set/clear did not synthesize a doctor sitemap lastmod",
    );
  });

  it("admin service booking pause: a doctor cannot PATCH or DELETE → 403", async (t) => {
    if (!app) return t.skip();
    for (const method of ["PATCH", "DELETE"] as const) {
      const res: InjectStatusResponse = await app.inject({
        method,
        url: `/api/admin/services/${pauseServiceId}/booking-pause`,
        cookies: doctor2Cookie,
        ...(method === "PATCH" ? { payload: pausePayload } : {}),
      });
      assert.equal(res.statusCode, 403, `${method}: ${res.body}`);
    }
  });

  it("admin service booking pause: an admin can PATCH and DELETE", async (t) => {
    if (!app) return t.skip();
    const editorialUpdatedAt = (
      await prisma.service.findUniqueOrThrow({ where: { id: pauseServiceId }, select: { updatedAt: true } })
    ).updatedAt;
    const set = await app.inject({
      method: "PATCH",
      url: `/api/admin/services/${pauseServiceId}/booking-pause`,
      cookies: adminCookie,
      payload: pausePayload,
    });
    assert.equal(set.statusCode, 200, set.body);
    const clear = await app.inject({
      method: "DELETE",
      url: `/api/admin/services/${pauseServiceId}/booking-pause`,
      cookies: adminCookie,
    });
    assert.equal(clear.statusCode, 200, clear.body);
    assert.equal(
      (
        await prisma.service.findUniqueOrThrow({
          where: { id: pauseServiceId },
          select: { updatedAt: true },
        })
      ).updatedAt.toISOString(),
      editorialUpdatedAt.toISOString(),
      "admin pause set/clear did not synthesize a service sitemap lastmod",
    );
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

  // ── Batch 1b: patient self-access to their own medical documents ───────────
  // The admin document read above is pinned, and the cross-tenant doctor read
  // is pinned as a 403, but nothing pinned the patient's own view of their own
  // documents. medical-documents.route.ts requires role === "PATIENT" and then
  // routes the read through guardMedicalRead, which resolves the guard's SELF
  // branch. Without this, a change to the guard's patient branch could revoke a
  // patient's access to their own record and every existing test would still
  // pass.
  it("patient self-access: a patient can read their own medical documents → 200", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/account/medical-documents",
      cookies: patient1Cookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const documents: Array<{ id: string }> = res.json().data.documents;
    assert.ok(
      documents.some((d) => d.id === medicalDocumentId),
      "the patient's own seeded MedicalDocument appears in their own view",
    );
  });

  it("patient self-access: the same route refuses a doctor session → 403", async (t) => {
    if (!app) return t.skip();
    // doctor3Cookie, NOT doctor1Cookie: the sign-out-all-devices test above
    // bumps doctor1's tokenVersion, so from that point on doctor1 is rejected
    // by requireAuth with a 401 and never reaches the route's PATIENT gate.
    const res = await app.inject({
      method: "GET",
      url: "/api/account/medical-documents",
      cookies: doctor3Cookie,
    });
    assert.equal(res.statusCode, 403, res.body);
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

  // ── Phase 6: manual-booking benefit options + reporting ────────────────────
  //
  // Three gates, deliberately not the same one:
  //
  //   - `membership-benefit-options` is plain `verifyAdminAccess`, NOT
  //     MANAGE_MEMBERSHIPS (§4.1). It is booking-time pricing for one patient
  //     an admin is already booking for, and gating it higher would leave
  //     LOCAL_ADMIN — the role that actually takes phone bookings — unable to
  //     see why a member's price differs.
  //   - the reports carry named members and their bookings, so they take
  //     MANAGE_MEMBERSHIPS with the rest of the member surface (§15).
  //   - the goodwill override on a manual booking takes SUPER_ADMIN in a real
  //     session, so a plain ADMIN must be refused even though the booking
  //     endpoint itself is open to them.

  it("membership benefit options: unauthenticated read → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-benefit-options?email=nobody@test.local&serviceId=authz-probe",
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("membership benefit options: a doctor session cannot price a patient → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-benefit-options?email=nobody@test.local&serviceId=authz-probe",
      cookies: doctor1Cookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("membership benefit options: an admin passes the gate → 404 on an unknown service", async (t) => {
    if (!app) return t.skip();
    // 404, not 403: the distinction is the assertion. A 403 here would mean
    // the endpoint is unreachable for the admins whose form depends on it.
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-benefit-options?email=nobody@test.local&serviceId=authz-probe-missing",
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 404, res.body);
  });

  it("membership reports: unauthenticated plan usage → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-reports/any-plan/usage",
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("membership reports: a doctor session cannot read plan usage → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-reports/any-plan/usage",
      cookies: doctor1Cookie,
    });
    // 403 from the gate, NOT 404 — authorization is decided before the route
    // reveals whether the plan exists.
    assert.equal(res.statusCode, 403, res.body);
  });

  it("membership reports: an admin passes the gate → 404 on an unknown plan", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-reports/any-plan/usage",
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 404, res.body);
  });

  it("membership reports: a doctor session cannot read a member's bookings → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-reports/enrollment/any-enrollment/usage",
      cookies: doctor1Cookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("manual booking: a plain ADMIN cannot apply a goodwill override → 403 (§11.7)", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/appointments",
      cookies: adminCookie,
      payload: {
        // A fully valid payload on purpose: the assertion is that the override
        // is refused on ROLE, so the body must get past validation first or a
        // 400 would pass for the wrong reason.
        patient: {
          email: "authz-override@test.local",
          fullName: "Authz Override",
          phone: "+353 871234567",
        },
        serviceId: "authz-probe",
        doctorId: "authz-probe",
        timeSlotId: "authz-probe",
        consultationMode: "ONLINE",
        countryCode: "ie",
        membership: {
          override: { benefitId: "authz-probe", reason: "authz matrix probe" },
        },
      },
    });
    // 403 from the SUPER_ADMIN check, NOT a 404/422 from the service — the
    // override is refused before any of the booking's ids are even resolved.
    assert.equal(res.statusCode, 403, res.body);
    const leaked = await prisma.user.findFirst({
      where: { email: "authz-override@test.local" },
    });
    assert.equal(leaked, null, "no patient account created by a denied override");
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

  // ── Write-path guard regression (production incident: a doctor locked out
  // for 4 days combined 4 defects; separately, EVERY write handler below was
  // completely unguarded until now while reads already were — a doctor
  // denied all reads could still sign a prescription or close a consult
  // blind). doctor3 owns appointment2/consultation2 (so the route's own
  // ownership lookup passes and the request reaches the guard), but
  // patient2 has granted no consent at all, so assertMedicalAccess denies
  // with DOCTOR_NO_VALID_ACCESS_PATH. Each test asserts the 403 AND that
  // nothing was written — a route that let the write through before
  // guarding would otherwise pass on status code alone.

  it("write guard: a doctor with no valid access path cannot create a medical note → 403, nothing written", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: `/api/doctor/appointments/${appointment2Id}/medical-notes`,
      cookies: doctor3Cookie,
      payload: { note: "authz probe note" },
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(res.json().details?.reasonCode, "DOCTOR_NO_VALID_ACCESS_PATH");
    const count = await prisma.medicalNote.count({ where: { appointmentId: appointment2Id } });
    assert.equal(count, 0);
  });

  it("write guard: a doctor with no valid access path cannot issue a prescription → 403, nothing written", async (t) => {
    if (!app) return t.skip();
    // prescription2 (seeded in before()) already exists on this consultation,
    // so assert on the specific drug name rather than a bare zero count.
    const res = await app.inject({
      method: "POST",
      url: `/api/doctor/appointments/${appointment2Id}/prescriptions`,
      cookies: doctor3Cookie,
      payload: { drugName: "Authz Probe Drug" },
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(res.json().details?.reasonCode, "DOCTOR_NO_VALID_ACCESS_PATH");
    const leaked = await prisma.prescription.findFirst({
      where: { consultation: { appointmentId: appointment2Id }, drugName: "Authz Probe Drug" },
    });
    assert.equal(leaked, null, "the denied prescription was not created");
  });

  it("write guard: a doctor with no valid access path cannot delete a prescription → 403, still present", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "DELETE",
      url: `/api/doctor/prescriptions/${prescription2Id}`,
      cookies: doctor3Cookie,
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(res.json().details?.reasonCode, "DOCTOR_NO_VALID_ACCESS_PATH");
    const still = await prisma.prescription.findUnique({ where: { id: prescription2Id } });
    assert.ok(still, "prescription was not deleted");
  });

  it("write guard: a doctor with no valid access path cannot save consultation SOAP notes → 403, nothing written", async (t) => {
    if (!app) return t.skip();
    const before = await prisma.consultation.findUniqueOrThrow({ where: { id: consultation2Id } });
    const res = await app.inject({
      method: "PATCH",
      url: `/api/doctor/appointments/${appointment2Id}/consultation`,
      cookies: doctor3Cookie,
      payload: { assessment: "authz probe assessment" },
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(res.json().details?.reasonCode, "DOCTOR_NO_VALID_ACCESS_PATH");
    const after = await prisma.consultation.findUniqueOrThrow({ where: { id: consultation2Id } });
    assert.equal(after.assessment, before.assessment, "consultation was not modified");
  });

  it("write guard: a doctor with no valid access path cannot sign the consultation → 403, still DRAFT", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: `/api/doctor/appointments/${appointment2Id}/consultation/sign`,
      cookies: doctor3Cookie,
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(res.json().details?.reasonCode, "DOCTOR_NO_VALID_ACCESS_PATH");
    const consult = await prisma.consultation.findUniqueOrThrow({ where: { id: consultation2Id } });
    assert.equal(consult.status, "DRAFT", "consultation was not signed");
  });

  it("write guard: a doctor with no valid access path cannot create an exam result → 403, nothing written", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: `/api/doctor/appointments/${appointment2Id}/exams`,
      cookies: doctor3Cookie,
      payload: { testName: "Authz Probe Test" },
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(res.json().details?.reasonCode, "DOCTOR_NO_VALID_ACCESS_PATH");
    const count = await prisma.examResult.count({ where: { appointmentId: appointment2Id } });
    assert.equal(count, 0);
  });

  it("write guard: a doctor with no valid access path cannot add a consultation service line → 403, nothing written", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: `/api/doctor/consultations/${consultation2Id}/services`,
      cookies: doctor3Cookie,
      payload: { customLabel: "Authz Probe Line" },
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.equal(res.json().details?.reasonCode, "DOCTOR_NO_VALID_ACCESS_PATH");
    const count = await prisma.consultationService.count({ where: { consultationId: consultation2Id } });
    assert.equal(count, 0);
  });
  // ── Coupons (global-admin only) ──────────────────────────────────────────
  // Coupons carry no country scope — a code works in every non-commission
  // market — so they are gated on `verifyGlobalAdminAccess`, which denies
  // LOCAL_ADMIN. These assertions are what keeps that from silently
  // regressing to plain `verifyAdminAccess` in a later edit.

  it("rejects an unauthenticated coupon list → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/admin/coupons" });
    assert.equal(res.statusCode, 401);
  });

  it("rejects an unauthenticated coupon create → 401, nothing written", async (t) => {
    if (!app) return t.skip();
    const before = await prisma.coupon.count();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/coupons",
      payload: {
        kind: "GENERAL",
        discountPercent: 20,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 86_400_000).toISOString(),
        maxRedemptions: 5,
      },
    });
    assert.equal(res.statusCode, 401);
    assert.equal(await prisma.coupon.count(), before);
  });

  it("rejects a patient session on the coupon list → 401/403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/coupons",
      cookies: patient1Cookie,
    });
    assert.ok([401, 403].includes(res.statusCode), res.body);
  });

  it("rejects a doctor session on the coupon list → 401/403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/coupons",
      cookies: doctor1Cookie,
    });
    assert.ok([401, 403].includes(res.statusCode), res.body);
  });

  it("allows a global admin to list coupons → 200", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/coupons",
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.ok(Array.isArray(res.json().data?.items));
  });

  it("the public coupon check is reachable unauthenticated and leaks nothing", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/coupons/check",
      payload: { code: "NOSUCHCODE", email: "nobody@example.com" },
    });
    // 400 = no cart on this request, which is a legitimate answer. What must
    // never happen is a 401/500, or a body naming a coupon.
    assert.ok([200, 400].includes(res.statusCode), res.body);
    assert.ok(!res.body.includes("discountPercent"), res.body);
  });
});

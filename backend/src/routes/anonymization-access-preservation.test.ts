import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs, deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * Group 2 — the access-preservation baseline.
 *
 * Anonymization erases login identity but RETAINS the clinical record. This
 * suite pins the half that is easy to break: after a patient is anonymized,
 * the treating doctor, an ADMIN and a SUPER_ADMIN must still be able to reach
 * the retained record, and an unrelated doctor must still be denied.
 *
 * The risk it was written to catch: every doctor/admin patient route resolved
 * `PatientProfile` by email, and anonymization tombstones `PatientProfile.email`
 * — while `Appointment.email` keeps the original value, so the route's own
 * authorization lookup still succeeded and only the profile lookup failed.
 *
 * The completion gate unblocked it with a durable `Appointment.patientProfileId`
 * link, written from the ACTUAL patient at booking time and stamped onto every
 * safely attributable appointment inside the anonymization transaction, before
 * the email is tombstoned. Readers resolve through that link
 * (`resolvePatientProfileIdByPatientEmail`) and fail closed when it is absent or
 * ambiguous.
 *
 * The rejected repair — falling back from the tombstoned email to
 * `Appointment.userId → PatientProfile.userId` — stays rejected, and no code
 * path may reintroduce it. `Appointment.userId` is the PURCHASER's id, not the
 * patient's (`complete-order-payment.service.ts` mints every appointment with
 * `userId: order.userId` while `email`/`familyMemberId` may name a dependent),
 * and a dependent's own `PatientProfile.userId` is null — so that fallback can
 * resolve a family booking to the purchaser's profile, a different patient.
 * `userId` is now only ever supporting evidence, alongside an agreeing email,
 * for rows that carry no `patientProfileId` at all
 * (see `doctorHasTreatmentRelationship` in medical-access-guard.ts).
 *
 * Runs in ENFORCE mode so a denial is a real 403, not a shadow-mode log.
 * Synthetic fixtures only; assertions use opaque ids.
 *
 * LOCAL_ADMIN scope is deliberately not re-fixtured here — it is decided from
 * `PatientProfile.countryFolderCode`, which this suite asserts is preserved,
 * and it is covered end-to-end by admin-appointments.local-admin-scope.test.ts
 * and admin-data-deletion.local-admin-scope.test.ts.
 */
describe("anonymization — retained-record access preservation", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];
  let envModule: typeof import("../config/env.js")["env"];
  let originalEnforce: boolean;
  let anonymizePatient: typeof import("../modules/data-policy/country-data-policy.service.js")["anonymizePatient"];

  const uniq = `anonacc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const currencyCode = uniqueCurrencyCode();

  let currencyId = "";
  let countryId = "";
  let treatingDoctorId = "";
  let treatingDoctorUserId = "";
  let unrelatedDoctorId = "";
  let unrelatedDoctorUserId = "";
  let adminUserId = "";
  let superAdminUserId = "";
  let patientUserId = "";
  let patientProfileId = "";
  let appointmentId = "";
  let consultationId = "";
  let prescriptionId = "";
  let medicalDocumentId = "";

  let treatingCookie: Record<string, string> = {};
  let unrelatedCookie: Record<string, string> = {};
  let adminCookie: Record<string, string> = {};
  let superAdminCookie: Record<string, string> = {};

  /** The address the doctor portal actually holds — it comes from Appointment. */
  let patientEmail = "";
  /** Captured before anonymization so post-anonymization identity can be compared. */
  let originalGlobalHealthNumber: string | null = null;
  let originalCountryFolderCode: string | null = null;

  function enc(email: string) {
    return encodeURIComponent(email);
  }

  const get = (url: string, cookies: Record<string, string>) =>
    app!.inject({ method: "GET", url, cookies });

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      envModule = (await import("../config/env.js")).env;
      anonymizePatient = (
        await import("../modules/data-policy/country-data-policy.service.js")
      ).anonymizePatient;
      app = await buildApp();
    } catch {
      return; // app null → every test below skips
    }

    originalEnforce = envModule.MEDICAL_ACCESS_ENFORCE;
    envModule.MEDICAL_ACCESS_ENFORCE = true;

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;

    const country = await prisma.country.create({
      data: {
        code: `x${uniq}`.slice(0, 8).toLowerCase(),
        name: `Anon Access ${uniq}`,
        slug: `anon-access-${uniq}`.toLowerCase(),
        legacyHomePath: `/lg-${uniq}`,
        teamPath: `/tm-${uniq}`,
        generalConsultationPath: `/gn-${uniq}`,
        specialistConsultationPath: `/sp-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryId = country.id;

    // ── Treating doctor: doctor-of-record for the retained appointment ──────
    const treatingDoctor = await prisma.doctor.create({
      data: {
        countryId: country.id,
        slug: `anon-treating-${uniq}`,
        fullName: "Anon Treating Doctor",
        title: "General Practitioner",
      },
    });
    treatingDoctorId = treatingDoctor.id;
    const treatingUser = await prisma.user.create({
      data: {
        email: `treating-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Anon Treating Doctor",
        role: "DOCTOR",
        doctorId: treatingDoctor.id,
        twoFactorVerifiedAt: new Date(),
      },
    });
    treatingDoctorUserId = treatingUser.id;
    await prisma.doctorConfidentialityAgreement.create({
      data: {
        doctorId: treatingDoctor.id,
        agreementVersion: "1.0.0",
        accepted: true,
        acceptedAt: new Date(),
      },
    });
    treatingCookie = {
      gh_auth: signAuthToken({
        sub: treatingUser.id,
        role: "DOCTOR",
        email: treatingUser.email,
        tokenVersion: 0,
      }),
    };

    // ── Unrelated doctor: never treated this patient ────────────────────────
    const unrelatedDoctor = await prisma.doctor.create({
      data: {
        countryId: country.id,
        slug: `anon-unrelated-${uniq}`,
        fullName: "Anon Unrelated Doctor",
        title: "General Practitioner",
      },
    });
    unrelatedDoctorId = unrelatedDoctor.id;
    const unrelatedUser = await prisma.user.create({
      data: {
        email: `unrelated-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Anon Unrelated Doctor",
        role: "DOCTOR",
        doctorId: unrelatedDoctor.id,
        twoFactorVerifiedAt: new Date(),
      },
    });
    unrelatedDoctorUserId = unrelatedUser.id;
    await prisma.doctorConfidentialityAgreement.create({
      data: {
        doctorId: unrelatedDoctor.id,
        agreementVersion: "1.0.0",
        accepted: true,
        acceptedAt: new Date(),
      },
    });
    unrelatedCookie = {
      gh_auth: signAuthToken({
        sub: unrelatedUser.id,
        role: "DOCTOR",
        email: unrelatedUser.email,
        tokenVersion: 0,
      }),
    };

    // ── ADMIN and SUPER_ADMIN ───────────────────────────────────────────────
    const adminUser = await prisma.user.create({
      data: {
        email: `admin-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Anon Admin",
        role: "ADMIN",
        twoFactorVerifiedAt: new Date(),
      },
    });
    adminUserId = adminUser.id;
    adminCookie = {
      gh_auth: signAuthToken({ sub: adminUser.id, role: "ADMIN", email: adminUser.email }),
    };

    const superAdminUser = await prisma.user.create({
      data: {
        email: `superadmin-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Anon Super Admin",
        role: "SUPER_ADMIN",
        twoFactorVerifiedAt: new Date(),
      },
    });
    superAdminUserId = superAdminUser.id;
    superAdminCookie = {
      gh_auth: signAuthToken({
        sub: superAdminUser.id,
        role: "SUPER_ADMIN",
        email: superAdminUser.email,
      }),
    };

    // ── Patient + profile, linked by userId (the stable relationship) ───────
    const patientUser = await prisma.user.create({
      data: {
        email: `patient-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Anon Test Patient",
        role: "PATIENT",
      },
    });
    patientUserId = patientUser.id;
    patientEmail = patientUser.email;

    const patientProfile = await prisma.patientProfile.create({
      data: {
        email: patientUser.email,
        userId: patientUser.id,
        fullName: "Anon Test Patient",
        countryFolderCode: "PT",
      },
    });
    patientProfileId = patientProfile.id;
    originalGlobalHealthNumber = patientProfile.globalHealthNumber ?? null;
    originalCountryFolderCode = patientProfile.countryFolderCode ?? null;

    await prisma.patientConsent.create({
      data: {
        patientProfileId: patientProfile.id,
        consentType: "MEDICAL_ACCESS_DIRECT",
        consentValue: true,
      },
    });

    // ── Retained clinical record ────────────────────────────────────────────
    const appointment = await prisma.appointment.create({
      data: {
        countryCode: country.code,
        consultationType: "GENERAL",
        fullName: patientUser.fullName,
        email: patientUser.email,
        consentAccepted: true,
        userId: patientUser.id,
        doctorId: treatingDoctor.id,
        status: "COMPLETED",
      },
    });
    appointmentId = appointment.id;

    const consultation = await prisma.consultation.create({
      data: { appointmentId: appointment.id, doctorId: treatingDoctor.id, status: "SIGNED" },
    });
    consultationId = consultation.id;

    const prescription = await prisma.prescription.create({
      data: {
        consultationId: consultation.id,
        doctorId: treatingDoctor.id,
        drugName: "Anon Test Drug",
      },
    });
    prescriptionId = prescription.id;

    const medicalDocument = await prisma.medicalDocument.create({
      data: {
        patientProfileId: patientProfile.id,
        uploadedByRole: "DOCTOR",
        documentType: "OTHER",
        title: "Anon Retained Clinical Upload",
        fileKey: `anon-test/${uniq}/clinical.pdf`,
        fileName: "clinical.pdf",
        mimetype: "application/pdf",
        byteSize: 2048,
      },
    });
    medicalDocumentId = medicalDocument.id;
  });

  after(async () => {
    if (!app) return;
    envModule.MEDICAL_ACCESS_ENFORCE = originalEnforce;
    await deleteMedicalAccessLogs(prisma, { patientProfileId });
    await deleteAuditLogs(prisma, {
      actorUserId: {
        in: [treatingDoctorUserId, unrelatedDoctorUserId, adminUserId, superAdminUserId, patientUserId],
      },
    });
    // anonymizePatient writes its completion record with actorUserId = the
    // admin id it was called with; also clear anything keyed to the profile.
    await deleteAuditLogs(prisma, { entityId: patientProfileId });
    await prisma.medicalDocument.deleteMany({ where: { id: medicalDocumentId } });
    await prisma.prescription.deleteMany({ where: { id: prescriptionId } });
    await prisma.consultation.deleteMany({ where: { id: consultationId } });
    await prisma.appointment.deleteMany({ where: { id: appointmentId } });
    await prisma.patientConsent.deleteMany({ where: { patientProfileId } });
    await prisma.patientNationalityDocument.deleteMany({ where: { patientProfileId } });
    await prisma.patientProfile.deleteMany({ where: { id: patientProfileId } });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [treatingDoctorUserId, unrelatedDoctorUserId, adminUserId, superAdminUserId, patientUserId],
        },
      },
    });
    await prisma.doctorConfidentialityAgreement.deleteMany({
      where: { doctorId: { in: [treatingDoctorId, unrelatedDoctorId] } },
    });
    await prisma.doctor.deleteMany({ where: { id: { in: [treatingDoctorId, unrelatedDoctorId] } } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  // ══ BEFORE anonymization ═══════════════════════════════════════════════
  describe("before anonymization", () => {
    it("treating doctor can open the retained profile", async () => {
      if (!app) return;
      const res = await get(`/api/doctor/patients/${enc(patientEmail)}/profile`, treatingCookie);
      assert.equal(res.statusCode, 200);
      assert.ok(res.json().data.profile, "profile is returned, not null");
    });

    it("treating doctor can reach an appointment-scoped patient endpoint", async () => {
      if (!app) return;
      const res = await get(
        `/api/doctor/patients/${enc(patientEmail)}/identity-verification`,
        treatingCookie,
      );
      assert.notEqual(res.statusCode, 404, "the patient resolves for their own doctor");
      assert.notEqual(res.statusCode, 403);
    });

    it("ADMIN can open the retained profile", async () => {
      if (!app) return;
      const res = await get(`/api/admin/patients/${enc(patientEmail)}/profile`, adminCookie);
      assert.equal(res.statusCode, 200);
    });

    it("SUPER_ADMIN can open the retained profile", async () => {
      if (!app) return;
      const res = await get(`/api/admin/patients/${enc(patientEmail)}/profile`, superAdminCookie);
      assert.equal(res.statusCode, 200);
    });

    it("ADMIN can list the retained clinical documents", async () => {
      if (!app) return;
      const res = await get(
        `/api/admin/patients/${enc(patientEmail)}/medical-documents`,
        adminCookie,
      );
      assert.equal(res.statusCode, 200);
    });

    it("an unrelated doctor is denied", async () => {
      if (!app) return;
      const res = await get(`/api/doctor/patients/${enc(patientEmail)}/profile`, unrelatedCookie);
      assert.ok(
        res.statusCode === 403 || res.statusCode === 404,
        `unrelated doctor must not read the record (got ${res.statusCode})`,
      );
    });
  });

  // ══ ANONYMIZE ══════════════════════════════════════════════════════════
  describe("after anonymization", () => {
    before(async () => {
      if (!app) return;
      await anonymizePatient({ patientProfileId, adminId: adminUserId });
    });

    it("retains every clinical row and its doctor relationship", async () => {
      if (!app) return;
      const [appt, consult, rx, doc] = await Promise.all([
        prisma.appointment.findUnique({ where: { id: appointmentId } }),
        prisma.consultation.findUnique({ where: { id: consultationId } }),
        prisma.prescription.findUnique({ where: { id: prescriptionId } }),
        prisma.medicalDocument.findUnique({ where: { id: medicalDocumentId } }),
      ]);
      assert.ok(appt, "appointment retained");
      assert.ok(consult, "consultation retained");
      assert.ok(rx, "prescription retained");
      assert.ok(doc, "medical document retained");
      assert.equal(appt!.doctorId, treatingDoctorId, "doctor-of-record unchanged");
      assert.equal(appt!.userId, patientUserId, "appointment→user linkage unchanged");
      assert.equal(
        appt!.patientProfileId,
        patientProfileId,
        "appointment→patient link stamped before the email tombstone, and unchanged after",
      );
      assert.equal(doc!.patientProfileId, patientProfileId, "document→profile linkage unchanged");
    });

    it("retains the profile identity keys the guard depends on", async () => {
      if (!app) return;
      const profile = await prisma.patientProfile.findUnique({ where: { id: patientProfileId } });
      assert.ok(profile, "profile row retained");
      assert.equal(profile!.id, patientProfileId);
      assert.equal(profile!.userId, patientUserId, "userId linkage retained");
      assert.equal(profile!.globalHealthNumber, originalGlobalHealthNumber);
      assert.equal(profile!.countryFolderCode, originalCountryFolderCode);
      assert.ok(profile!.anonymizedAt, "anonymization is recorded on the row");
    });

    it("treating doctor can STILL open the retained profile", async () => {
      if (!app) return;
      const res = await get(`/api/doctor/patients/${enc(patientEmail)}/profile`, treatingCookie);
      assert.equal(res.statusCode, 200);
      assert.ok(
        res.json().data.profile,
        "the retained profile must still resolve for the doctor of record",
      );
    });

    it("treating doctor can STILL reach an appointment-scoped patient endpoint", async () => {
      if (!app) return;
      const res = await get(
        `/api/doctor/patients/${enc(patientEmail)}/identity-verification`,
        treatingCookie,
      );
      assert.notEqual(res.statusCode, 404, "the retained patient must still resolve");
      assert.notEqual(res.statusCode, 403);
    });

    it("ADMIN can STILL open the retained profile", async () => {
      if (!app) return;
      const res = await get(`/api/admin/patients/${enc(patientEmail)}/profile`, adminCookie);
      assert.equal(res.statusCode, 200);
    });

    it("SUPER_ADMIN can STILL open the retained profile", async () => {
      if (!app) return;
      const res = await get(`/api/admin/patients/${enc(patientEmail)}/profile`, superAdminCookie);
      assert.equal(res.statusCode, 200);
    });

    it("ADMIN can STILL list the retained clinical documents", async () => {
      if (!app) return;
      const res = await get(
        `/api/admin/patients/${enc(patientEmail)}/medical-documents`,
        adminCookie,
      );
      assert.equal(res.statusCode, 200);
    });

    it("an unrelated doctor is STILL denied — no rule was widened", async () => {
      if (!app) return;
      const res = await get(`/api/doctor/patients/${enc(patientEmail)}/profile`, unrelatedCookie);
      assert.ok(
        res.statusCode === 403 || res.statusCode === 404,
        `unrelated doctor must still be denied (got ${res.statusCode})`,
      );
    });
  });
});

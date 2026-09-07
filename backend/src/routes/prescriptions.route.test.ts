import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";

/**
 * TS-1: `prescriptions.route.ts` had no test file of its own. The
 * cross-tenant case (doctor 2 reading doctor 1's appointment) is already
 * pinned in authz-matrix.test.ts; what is NOT pinned anywhere is the plain
 * role gate on each of the three registrations, which is the layer in front
 * of that scoping:
 *
 *   GET    /api/doctor/appointments/:id/prescriptions   verifyClinicalReadAccess
 *   POST   /api/doctor/appointments/:id/prescriptions   verifyDoctorAccess
 *   DELETE /api/doctor/prescriptions/:prescriptionId    verifyDoctorAccess
 *
 * Authorization only: unauthenticated 401, a patient session 403, and the
 * owning doctor reaching the handler. Prescription content, the signed-
 * consultation lock and the medical-access guard are other files' business.
 *
 * Deliberately NOT loading backend/.env — this runs against the isolated local
 * test cluster.
 */
describe("prescriptions route — authorization", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];
  let bootError: unknown = null;

  const uniq = `rxauthz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let currencyId = "";
  let countryId = "";
  let doctorId = "";
  let appointmentId = "";
  let consultationId = "";
  let prescriptionId = "";
  const userIds: string[] = [];
  let patientProfileId = "";

  let doctorCookie: Record<string, string> = {};
  let patientCookie: Record<string, string> = {};

  const listAs = (cookies?: Record<string, string>) =>
    app!.inject({
      method: "GET",
      url: `/api/doctor/appointments/${appointmentId}/prescriptions`,
      ...(cookies ? { cookies } : {}),
    });

  const createAs = (cookies?: Record<string, string>) =>
    app!.inject({
      method: "POST",
      url: `/api/doctor/appointments/${appointmentId}/prescriptions`,
      ...(cookies ? { cookies } : {}),
      payload: { drugName: "Authz Probe Drug" },
    });

  const deleteAs = (cookies?: Record<string, string>) =>
    app!.inject({
      method: "DELETE",
      url: `/api/doctor/prescriptions/${prescriptionId}`,
      ...(cookies ? { cookies } : {}),
    });

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      app = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }

    const { uniqueCurrencyCode } = await import("../test-utils/unique-currency-code.js");
    const currency = await prisma.currency.create({
      data: { code: uniqueCurrencyCode(), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: `r${uniq}`.slice(0, 8).toLowerCase(),
        name: `Rx Authz ${uniq}`,
        slug: `rx-authz-${uniq}`.toLowerCase(),
        legacyHomePath: `/lg-r-${uniq}`,
        teamPath: `/tm-r-${uniq}`,
        generalConsultationPath: `/gn-r-${uniq}`,
        specialistConsultationPath: `/sp-r-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryId = country.id;
    const doctor = await prisma.doctor.create({
      data: {
        countryId: country.id,
        slug: `rx-authz-doctor-${uniq}`,
        fullName: "Rx Authz Doctor",
        title: "General Practitioner",
      },
    });
    doctorId = doctor.id;
    const doctorUser = await prisma.user.create({
      data: {
        email: `rxdoctor-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Rx Authz Doctor",
        role: "DOCTOR",
        doctorId: doctor.id,
        twoFactorVerifiedAt: new Date(),
      },
    });
    userIds.push(doctorUser.id);
    await prisma.doctorConfidentialityAgreement.create({
      data: {
        doctorId: doctor.id,
        agreementVersion: "1.0.0",
        accepted: true,
        acceptedAt: new Date(),
      },
    });
    doctorCookie = {
      gh_auth: signAuthToken({
        sub: doctorUser.id,
        role: "DOCTOR",
        email: doctorUser.email,
        tokenVersion: 0,
      }),
    };

    const patientUser = await prisma.user.create({
      data: {
        email: `rxpatient-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Rx Authz Patient",
        role: "PATIENT",
      },
    });
    userIds.push(patientUser.id);
    patientCookie = {
      gh_auth: signAuthToken({
        sub: patientUser.id,
        role: "PATIENT",
        email: patientUser.email,
        tokenVersion: 0,
      }),
    };
    const patientProfile = await prisma.patientProfile.create({
      data: {
        email: patientUser.email,
        userId: patientUser.id,
        fullName: patientUser.fullName,
      },
    });
    patientProfileId = patientProfile.id;

    const appointment = await prisma.appointment.create({
      data: {
        countryCode: country.code,
        consultationType: "GENERAL",
        fullName: patientUser.fullName,
        email: patientUser.email,
        consentAccepted: true,
        userId: patientUser.id,
        doctorId: doctor.id,
      },
    });
    appointmentId = appointment.id;
    const consultation = await prisma.consultation.create({
      data: { appointmentId: appointment.id, doctorId: doctor.id, status: "DRAFT" },
    });
    consultationId = consultation.id;
    const prescription = await prisma.prescription.create({
      data: {
        consultationId: consultation.id,
        doctorId: doctor.id,
        drugName: "Rx Authz Seed Drug",
      },
    });
    prescriptionId = prescription.id;
  });

  after(async () => {
    if (!app) return;
    const { deleteAuditLogs, deleteMedicalAccessLogs } = await import(
      "../test-utils/audit-cleanup.js"
    );
    await deleteMedicalAccessLogs(prisma, { patientProfileId });
    await deleteAuditLogs(prisma, { actorUserId: { in: userIds } });
    await prisma.prescription.deleteMany({ where: { consultationId } });
    await prisma.consultation.deleteMany({ where: { id: consultationId } });
    await prisma.appointment.deleteMany({ where: { id: appointmentId } });
    await prisma.patientProfile.deleteMany({ where: { id: patientProfileId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.doctor.deleteMany({ where: { id: doctorId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  it("rejects unauthenticated reads, writes and deletes → 401", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    assert.equal((await listAs()).statusCode, 401);
    assert.equal((await createAs()).statusCode, 401);
    assert.equal((await deleteAs()).statusCode, 401);
  });

  it("rejects a patient session on all three verbs → 403", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const list = await listAs(patientCookie);
    assert.equal(list.statusCode, 403, list.body);
    const create = await createAs(patientCookie);
    assert.equal(create.statusCode, 403, create.body);
    const del = await deleteAs(patientCookie);
    assert.equal(del.statusCode, 403, del.body);
    // The seeded prescription is still there — a refused delete deletes nothing.
    assert.ok(await prisma.prescription.findUnique({ where: { id: prescriptionId } }));
  });

  it("lets the owning doctor read their own appointment's prescriptions → 200", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await listAs(doctorCookie);
    assert.equal(res.statusCode, 200, res.body);
    const ids = (res.json().data.items as Array<{ id: string }>).map((p) => p.id);
    assert.ok(ids.includes(prescriptionId), "the seeded prescription is returned");
  });

  it("lets the owning doctor create and delete → 2xx", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const created = await createAs(doctorCookie);
    assert.ok(
      created.statusCode >= 200 && created.statusCode < 300,
      `create: ${created.statusCode} ${created.body}`,
    );
    const del = await deleteAs(doctorCookie);
    assert.ok(
      del.statusCode >= 200 && del.statusCode < 300,
      `delete: ${del.statusCode} ${del.body}`,
    );
    assert.equal(await prisma.prescription.findUnique({ where: { id: prescriptionId } }), null);
  });
});

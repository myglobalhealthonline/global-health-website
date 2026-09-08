import "../test-guard.js";

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

describe("doctor first-chart creation binds one provable patient", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let bootError: unknown;
  let doctorId = "";
  let otherDoctorId = "";
  let doctorUserId = "";
  let countryId = "";
  let currencyId = "";
  let cookie: Record<string, string> = {};

  const uniq = `first-chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const appointmentIds: string[] = [];
  const profileIds: string[] = [];
  const patientUserIds: string[] = [];
  const fixtureEmails: string[] = [];

  before(async () => {
    try {
      prisma = (await import("../db/prisma.js")).prisma;
      const { signAuthToken } = await import("../utils/auth-session.js");
      const { buildApp } = await import("../app.js");
      app = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");

      const currency = await prisma.currency.create({
        data: { code: uniqueCurrencyCode(), symbol: "T", decimals: 2 },
      });
      currencyId = currency.id;
      const country = await prisma.country.create({
        data: {
          code: `fc${Math.random().toString(36).slice(2, 7)}`,
          name: `Synthetic country ${uniq}`,
          slug: `synthetic-country-${uniq}`,
          legacyHomePath: `/synthetic-home-${uniq}`,
          teamPath: `/synthetic-team-${uniq}`,
          generalConsultationPath: `/synthetic-general-${uniq}`,
          specialistConsultationPath: `/synthetic-specialist-${uniq}`,
          currencyId,
        },
      });
      countryId = country.id;
      const doctor = await prisma.doctor.create({
        data: { countryId, slug: `doctor-${uniq}`, fullName: "Synthetic Doctor", title: "GP" },
      });
      doctorId = doctor.id;
      const otherDoctor = await prisma.doctor.create({
        data: {
          countryId,
          slug: `other-doctor-${uniq}`,
          fullName: "Other Synthetic Doctor",
          title: "GP",
        },
      });
      otherDoctorId = otherDoctor.id;
      const user = await prisma.user.create({
        data: {
          email: `doctor-${uniq}@example.invalid`,
          passwordHash: "x",
          fullName: "Synthetic Doctor",
          role: "DOCTOR",
          doctorId,
          twoFactorVerifiedAt: new Date(),
        },
      });
      doctorUserId = user.id;
      await prisma.doctorConfidentialityAgreement.create({
        data: {
          doctorId,
          agreementVersion: "1.0.0",
          accepted: true,
          acceptedAt: new Date(),
        },
      });
      cookie = {
        gh_auth: signAuthToken({
          sub: user.id,
          role: "DOCTOR",
          email: user.email,
          tokenVersion: 0,
        }),
      };
    } catch (error) {
      bootError = error;
      await app?.close();
      app = null;
      throw error;
    }
  });

  after(async () => {
    if (app) await app.close();
    if (bootError) return;
    const createdProfiles = await prisma.patientProfile.findMany({
      where: { email: { in: fixtureEmails } },
      select: { id: true },
    });
    const allProfileIds = [...new Set([...profileIds, ...createdProfiles.map((row) => row.id)])];
    await deleteMedicalAccessLogs(prisma, { patientProfileId: { in: allProfileIds } });
    await prisma.securityAlert.deleteMany({ where: { patientId: { in: allProfileIds } } });
    await prisma.patientConsent.deleteMany({ where: { patientProfileId: { in: allProfileIds } } });
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: allProfileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: patientUserIds } } });
    await prisma.doctorConfidentialityAgreement.deleteMany({ where: { doctorId } });
    await prisma.user.delete({ where: { id: doctorUserId } });
    await prisma.doctor.deleteMany({ where: { id: { in: [doctorId, otherDoctorId] } } });
    await prisma.country.delete({ where: { id: countryId } });
    await prisma.currency.delete({ where: { id: currencyId } });
  });

  const boot = (t: { skip: (message?: string) => void }) => {
    if (app) return true;
    t.skip(`buildApp failed: ${String(bootError)}`);
    return false;
  };

  const createPatientUser = async (label: string) => {
    const user = await prisma.user.create({
      data: {
        email: `${label}-${uniq}@example.invalid`,
        passwordHash: "x",
        fullName: `Synthetic ${label}`,
        role: "PATIENT",
      },
    });
    patientUserIds.push(user.id);
    return user.id;
  };

  const createAppointment = async (input: {
    email: string;
    doctorId?: string;
    userId?: string | null;
    fullName: string;
    phone: string;
  }) => {
    if (!fixtureEmails.includes(input.email)) fixtureEmails.push(input.email);
    const row = await prisma.appointment.create({
      data: {
        countryCode: "PT",
        consultationType: "GENERAL",
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        consentAccepted: true,
        doctorId: input.doctorId ?? doctorId,
        userId: input.userId ?? null,
      },
    });
    appointmentIds.push(row.id);
    return row.id;
  };

  const patchProfile = (email: string, payload: Record<string, unknown>) =>
    app!.inject({
      method: "PATCH",
      url: `/api/doctor/patients/${encodeURIComponent(email)}/profile`,
      cookies: cookie,
      payload,
    });

  const assertRefusedWithoutPartialWrite = async (email: string, ids: string[]) => {
    assert.equal(await prisma.patientProfile.count({ where: { email } }), 0);
    const rows = await prisma.appointment.findMany({
      where: { id: { in: ids } },
      select: { patientProfileId: true },
    });
    assert.deepEqual(rows.map((row) => row.patientProfileId), ids.map(() => null));
  };

  it("refuses two unrelated guest appointments instead of merging them", async (t) => {
    if (!boot(t)) return;
    const email = `two-guests-${uniq}@example.invalid`;
    const ids = [
      await createAppointment({
        email,
        fullName: "Synthetic Guest Alpha",
        phone: "+351000000001",
      }),
      await createAppointment({
        email,
        fullName: "Synthetic Guest Beta",
        phone: "+351000000002",
      }),
    ];

    const response = await patchProfile(email, { preferredPharmacy: "Synthetic Pharmacy" });
    assert.equal(response.statusCode, 404, response.body);
    await assertRefusedWithoutPartialWrite(email, ids);
    assert.equal(response.body.includes("Synthetic Guest"), false);
    assert.equal(response.body.includes("+351"), false);
  });

  it("refuses mixed guest and account-backed evidence", async (t) => {
    if (!boot(t)) return;
    const email = `mixed-${uniq}@example.invalid`;
    const accountId = await createPatientUser("mixed-account");
    const ids = [
      await createAppointment({
        email,
        fullName: "Synthetic Guest",
        phone: "+351000000003",
      }),
      await createAppointment({
        email,
        userId: accountId,
        fullName: "Synthetic Account Patient",
        phone: "+351000000004",
      }),
    ];

    const response = await patchProfile(email, { preferredPharmacy: "Synthetic Pharmacy" });
    assert.equal(response.statusCode, 404, response.body);
    await assertRefusedWithoutPartialWrite(email, ids);
  });

  it("refuses multiple account identities", async (t) => {
    if (!boot(t)) return;
    const email = `two-accounts-${uniq}@example.invalid`;
    const first = await createPatientUser("first-account");
    const second = await createPatientUser("second-account");
    const ids = [
      await createAppointment({
        email,
        userId: first,
        fullName: "Synthetic Account Alpha",
        phone: "+351000000005",
      }),
      await createAppointment({
        email,
        userId: second,
        fullName: "Synthetic Account Beta",
        phone: "+351000000006",
      }),
    ];

    const response = await patchProfile(email, { preferredPharmacy: "Synthetic Pharmacy" });
    assert.equal(response.statusCode, 404, response.body);
    await assertRefusedWithoutPartialWrite(email, ids);
  });

  it("requires a single guest appointment system-wide", async (t) => {
    if (!boot(t)) return;
    const email = `cross-doctor-guests-${uniq}@example.invalid`;
    const ids = [
      await createAppointment({
        email,
        fullName: "Synthetic Treating Guest",
        phone: "+351000000007",
      }),
      await createAppointment({
        email,
        doctorId: otherDoctorId,
        fullName: "Synthetic Other Guest",
        phone: "+351000000008",
      }),
    ];

    const response = await patchProfile(email, { preferredPharmacy: "Synthetic Pharmacy" });
    assert.equal(response.statusCode, 404, response.body);
    await assertRefusedWithoutPartialWrite(email, ids);
  });

  it("creates and reopens a chart from exactly one guest appointment", async (t) => {
    if (!boot(t)) return;
    const email = `safe-guest-${uniq}@example.invalid`;
    const appointmentId = await createAppointment({
      email,
      fullName: "Synthetic Safe Guest",
      phone: "+351000000010",
    });

    const response = await patchProfile(email, { preferredPharmacy: "Synthetic Pharmacy" });
    assert.equal(response.statusCode, 200, response.body);
    const profile = await prisma.patientProfile.findUnique({ where: { email } });
    assert.ok(profile);
    profileIds.push(profile.id);
    assert.equal(profile.userId, null);
    assert.equal(profile.fullName, "Synthetic Safe Guest");
    assert.equal(profile.phone, "+351000000010");
    assert.equal(
      (await prisma.appointment.findUnique({ where: { id: appointmentId } }))!.patientProfileId,
      profile.id,
    );

    await prisma.patientConsent.create({
      data: {
        patientProfileId: profile.id,
        consentType: "MEDICAL_ACCESS_DIRECT",
        consentValue: true,
      },
    });
    const reopened = await app!.inject({
      method: "GET",
      url: `/api/doctor/patients/${encodeURIComponent(email)}/profile`,
      cookies: cookie,
    });
    assert.equal(reopened.statusCode, 200, reopened.body);
    assert.equal(reopened.json().data.profile.id, profile.id);
  });

  it("rolls back chart creation when exact appointment identity changes", async (t) => {
    if (!boot(t)) return;
    const email = `identity-race-${uniq}@example.invalid`;
    const userId = await createPatientUser("identity-race");
    const appointmentId = await createAppointment({
      email,
      userId,
      fullName: "Synthetic Race Patient",
      phone: "+351000000011",
    });
    const delegate = prisma.patientProfile as unknown as {
      findUnique: (args: Record<string, unknown>) => Promise<unknown>;
    };
    const originalFindUnique = delegate.findUnique.bind(prisma.patientProfile);
    let signal!: () => void;
    let release!: () => void;
    const reached = new Promise<void>((resolve) => { signal = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    delegate.findUnique = async (args) => {
      const result = await originalFindUnique(args);
      if ((args.where as { userId?: string } | undefined)?.userId === userId && result === null) {
        signal();
        await gate;
      }
      return result;
    };

    try {
      const request = patchProfile(email, { preferredPharmacy: "Synthetic Losing Write" });
      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          reached,
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("identity barrier was not reached")), 10_000);
            timer.unref();
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { email: `changed-${uniq}@example.invalid` },
      });
      release();
      const response = await request;
      assert.equal(response.statusCode, 409, response.body);
      assert.equal(response.body.includes(email), false);
      assert.equal(response.body.includes("Synthetic Losing Write"), false);
      assert.equal(await prisma.patientProfile.count({ where: { email } }), 0);
      assert.equal(
        (await prisma.appointment.findUnique({ where: { id: appointmentId } }))!.patientProfileId,
        null,
      );
    } finally {
      release();
      delegate.findUnique = originalFindUnique;
    }
  });

  it("creates and immediately resolves a safely proven account-backed chart", async (t) => {
    if (!boot(t)) return;
    const email = `safe-account-${uniq}@example.invalid`;
    const userId = await createPatientUser("safe-account");
    const appointmentId = await createAppointment({
      email,
      userId,
      fullName: "Synthetic Safe Patient",
      phone: "+351000000009",
    });

    const response = await patchProfile(email, { preferredPharmacy: "Synthetic Pharmacy" });
    assert.equal(response.statusCode, 200, response.body);
    const profile = await prisma.patientProfile.findUnique({ where: { email } });
    assert.ok(profile);
    profileIds.push(profile.id);
    assert.equal(profile.userId, userId);
    assert.equal(profile.fullName, "Synthetic Safe Patient");
    assert.equal(profile.phone, "+351000000009");
    assert.equal(
      (await prisma.appointment.findUnique({ where: { id: appointmentId } }))!.patientProfileId,
      profile.id,
    );

    await prisma.patientConsent.create({
      data: {
        patientProfileId: profile.id,
        consentType: "MEDICAL_ACCESS_DIRECT",
        consentValue: true,
      },
    });
    const reopened = await app!.inject({
      method: "GET",
      url: `/api/doctor/patients/${encodeURIComponent(email)}/profile`,
      cookies: cookie,
    });
    assert.equal(reopened.statusCode, 200, reopened.body);
    assert.equal(reopened.json().data.profile.id, profile.id);
  });
});

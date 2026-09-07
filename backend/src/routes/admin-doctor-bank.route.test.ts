import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";

/**
 * TS-1: `admin-doctor-bank.route.ts` — the doctor payout IBAN reveal — had no
 * test file. Its whole access model is one `onRequest` hook calling
 * `verifyGlobalAdminAccess`, so the difference between "only ADMIN and
 * SUPER_ADMIN can read a doctor's bank details" and "anyone with a session
 * can" is a single helper call. SEC-001 deliberately excludes LOCAL_ADMIN:
 * payout data is global financial data, not country-scoped clinical data, and
 * a country-scoped admin has no business reading it.
 *
 * Scope is authorization only — unauthenticated, wrong role, right role. The
 * masking/decryption behaviour behind `?reveal=1` is not exercised here.
 *
 * Deliberately NOT loading backend/.env — this runs against the isolated local
 * test cluster.
 */
describe("admin doctor bank details — authorization", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];
  let bootError: unknown = null;

  const uniq = `bankauthz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let currencyId = "";
  let countryId = "";
  let doctorId = "";

  const userIds: string[] = [];
  let doctorCookie: Record<string, string> = {};
  let patientCookie: Record<string, string> = {};
  let localAdminCookie: Record<string, string> = {};
  let adminCookie: Record<string, string> = {};
  let superAdminCookie: Record<string, string> = {};

  const readBank = (cookies?: Record<string, string>) =>
    app!.inject({
      method: "GET",
      url: `/api/admin/doctors/${doctorId}/bank`,
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
        code: `b${uniq}`.slice(0, 8).toLowerCase(),
        name: `Bank Authz ${uniq}`,
        slug: `bank-authz-${uniq}`.toLowerCase(),
        legacyHomePath: `/lg-b-${uniq}`,
        teamPath: `/tm-b-${uniq}`,
        generalConsultationPath: `/gn-b-${uniq}`,
        specialistConsultationPath: `/sp-b-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryId = country.id;
    const doctor = await prisma.doctor.create({
      data: {
        countryId: country.id,
        slug: `bank-authz-doctor-${uniq}`,
        fullName: "Bank Authz Doctor",
        title: "General Practitioner",
      },
    });
    doctorId = doctor.id;

    const mkSession = async (
      label: string,
      role: "PATIENT" | "DOCTOR" | "LOCAL_ADMIN" | "ADMIN" | "SUPER_ADMIN",
      extra: { doctorId?: string; allowedCountryFolders?: string[] } = {},
    ) => {
      const user = await prisma.user.create({
        data: {
          email: `${label}-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `${label} ${uniq}`,
          role,
          ...(extra.doctorId ? { doctorId: extra.doctorId } : {}),
          ...(extra.allowedCountryFolders
            ? { allowedCountryFolders: extra.allowedCountryFolders }
            : {}),
        },
      });
      userIds.push(user.id);
      return {
        gh_auth: signAuthToken({ sub: user.id, role, email: user.email, tokenVersion: 0 }),
      };
    };

    doctorCookie = await mkSession("doctor", "DOCTOR", { doctorId: doctor.id });
    patientCookie = await mkSession("patient", "PATIENT");
    localAdminCookie = await mkSession("localadmin", "LOCAL_ADMIN", {
      allowedCountryFolders: [country.code],
    });
    adminCookie = await mkSession("admin", "ADMIN");
    superAdminCookie = await mkSession("superadmin", "SUPER_ADMIN");
  });

  after(async () => {
    if (!app) return;
    await prisma.doctorBankAccount.deleteMany({ where: { doctorId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.doctor.deleteMany({ where: { id: doctorId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  it("rejects an unauthenticated read → 401", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await readBank();
    assert.equal(res.statusCode, 401, res.body);
  });

  it("rejects a doctor session → 403", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await readBank(doctorCookie);
    assert.equal(res.statusCode, 403, res.body);
  });

  it("rejects a patient session → 403", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await readBank(patientCookie);
    assert.equal(res.statusCode, 403, res.body);
  });

  it("rejects a LOCAL_ADMIN — payout data is global, not country-scoped (SEC-001) → 403", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await readBank(localAdminCookie);
    assert.equal(res.statusCode, 403, res.body);
  });

  it("allows ADMIN → 200", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await readBank(adminCookie);
    assert.equal(res.statusCode, 200, res.body);
  });

  it("allows SUPER_ADMIN → 200", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await readBank(superAdminCookie);
    assert.equal(res.statusCode, 200, res.body);
  });
});

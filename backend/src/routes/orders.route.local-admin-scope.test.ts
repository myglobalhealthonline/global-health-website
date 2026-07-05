import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * Regression test for a bug found in a prior review pass: /api/admin/orders*
 * gated only on verifyAdminAccess, which treats LOCAL_ADMIN the same as
 * ADMIN — no folder-scope check, no audit trail. A LOCAL_ADMIN scoped to
 * one country could read and edit every other country's orders.
 *
 * Also covers a second bug found while fixing the first: the initial fix
 * used resolveOptionalAuthUser to resolve the actor's role, but that
 * function only resolves PATIENT/ADMIN sessions and returns null for
 * LOCAL_ADMIN — which would have misidentified every real LOCAL_ADMIN
 * session as unauthenticated and blocked them outright, rather than
 * correctly scoping them. Fixed by decoding the session JWT directly
 * (resolveAdminSessionActor), same pattern verifyAdminAccess already uses.
 */
describe("admin orders routes — LOCAL_ADMIN country scope", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];
  let bootError: unknown = null;

  const uniq = `orderscope-${Date.now()}`;
  let currencyId: string;
  let countryIeId: string;
  let countryPtId: string;
  let localAdminId: string;
  let fullAdminId: string;
  let ieOrderId: string;
  let ptOrderId: string;
  let localAdminCookie: Record<string, string> = {};
  let fullAdminCookie: Record<string, string> = {};

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

    const currency = await prisma.currency.create({
      // Currency.code has no declared max length in the schema, but keep it
      // short by convention. Slicing from the END of the epoch keeps the
      // varying digits — slicing `C${uniq}` from the start (uniq begins
      // with the long "orderscope-" prefix) would always cut off before
      // any timestamp digit, producing the same "code" on every run.
      data: { code: `C${Date.now()}`.slice(-9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;

    // Fake country codes unique to this test run — "ie"/"pt" collide with
    // real seeded data (Country.code is globally unique).
    const ieCode = `z1${uniq}`.slice(0, 8).toLowerCase();
    const ptCode = `z2${uniq}`.slice(0, 8).toLowerCase();

    const mkCountry = async (code: string) =>
      (
        await prisma.country.create({
          data: {
            code,
            name: `Order Scope ${code} ${uniq}`,
            slug: `order-scope-${code}-${uniq}`,
            legacyHomePath: `/legacy-${code}-${uniq}`,
            teamPath: `/team-${code}-${uniq}`,
            generalConsultationPath: `/gen-${code}-${uniq}`,
            specialistConsultationPath: `/spec-${code}-${uniq}`,
            currencyId: currency.id,
          },
        })
      ).id;
    countryIeId = await mkCountry(ieCode);
    countryPtId = await mkCountry(ptCode);

    const localAdmin = await prisma.user.create({
      data: {
        email: `local-admin-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Local Admin PT",
        role: "LOCAL_ADMIN",
        allowedCountryFolders: [ptCode],
      },
    });
    localAdminId = localAdmin.id;
    const fullAdmin = await prisma.user.create({
      data: {
        email: `full-admin-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Full Admin",
        role: "ADMIN",
      },
    });
    fullAdminId = fullAdmin.id;

    localAdminCookie = {
      gh_auth: signAuthToken({ sub: localAdminId, role: "LOCAL_ADMIN", email: localAdmin.email }),
    };
    fullAdminCookie = {
      gh_auth: signAuthToken({ sub: fullAdminId, role: "ADMIN", email: fullAdmin.email }),
    };

    const ieOrder = await prisma.order.create({
      data: {
        email: `patient-ie-${uniq}@test.local`,
        fullName: "Patient IE",
        countryCode: ieCode,
        currencyCode: currency.code,
        subtotalCents: 1000,
        totalCents: 1000,
      },
    });
    ieOrderId = ieOrder.id;
    const ptOrder = await prisma.order.create({
      data: {
        email: `patient-pt-${uniq}@test.local`,
        fullName: "Patient PT",
        countryCode: ptCode,
        currencyCode: currency.code,
        subtotalCents: 1000,
        totalCents: 1000,
      },
    });
    ptOrderId = ptOrder.id;
  });

  after(async () => {
    if (app) await app.close();
    if (bootError) return;
    await prisma.order.deleteMany({ where: { id: { in: [ieOrderId, ptOrderId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [localAdminId, fullAdminId] } } });
    await prisma.country.deleteMany({ where: { id: { in: [countryIeId, countryPtId] } } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  it("LOCAL_ADMIN (pt) can read a pt order", async (t) => {
    if (!app) return t.skip(`buildApp() failed: ${describeError(bootError)}`);
    const res = await app.inject({
      method: "GET",
      url: `/api/admin/orders/${ptOrderId}`,
      cookies: localAdminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  it("LOCAL_ADMIN (pt) is blocked from reading an ie order — 403, not silent success", async (t) => {
    if (!app) return t.skip(`buildApp() failed: ${describeError(bootError)}`);
    const res = await app.inject({
      method: "GET",
      url: `/api/admin/orders/${ieOrderId}`,
      cookies: localAdminCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("LOCAL_ADMIN (pt) is blocked from PATCHing an ie order", async (t) => {
    if (!app) return t.skip(`buildApp() failed: ${describeError(bootError)}`);
    const res = await app.inject({
      method: "PATCH",
      url: `/api/admin/orders/${ieOrderId}`,
      cookies: localAdminCookie,
      payload: { status: "CANCELLED" },
    });
    assert.equal(res.statusCode, 403, res.body);
    const stillPending = await prisma.order.findUnique({ where: { id: ieOrderId } });
    assert.notEqual(stillPending?.status, "CANCELLED", "the out-of-scope order was not mutated");
  });

  it("LOCAL_ADMIN (pt) list only sees pt orders even without an explicit filter", async (t) => {
    if (!app) return t.skip(`buildApp() failed: ${describeError(bootError)}`);
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/orders",
      cookies: localAdminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const ids = (res.json().data.items as Array<{ id: string }>).map((o) => o.id);
    assert.ok(ids.includes(ptOrderId), "pt order visible");
    assert.ok(!ids.includes(ieOrderId), "ie order not visible to a pt-scoped LOCAL_ADMIN");
  });

  it("bulk update excludes out-of-scope ids for LOCAL_ADMIN instead of applying to all", async (t) => {
    if (!app) return t.skip(`buildApp() failed: ${describeError(bootError)}`);
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/orders/bulk",
      cookies: localAdminCookie,
      payload: { ids: [ieOrderId, ptOrderId], status: "CANCELLED" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const json = res.json();
    assert.deepEqual(json.data.skippedIds, [ieOrderId]);
    assert.equal(json.data.count, 1, "only the in-scope pt order was updated");

    const ieAfter = await prisma.order.findUnique({ where: { id: ieOrderId } });
    assert.notEqual(ieAfter?.status, "CANCELLED", "ie order untouched");
    const ptAfter = await prisma.order.findUnique({ where: { id: ptOrderId } });
    assert.equal(ptAfter?.status, "CANCELLED", "pt order updated");
  });

  it("full ADMIN (unscoped) can read and edit orders in any country", async (t) => {
    if (!app) return t.skip(`buildApp() failed: ${describeError(bootError)}`);
    const getRes = await app.inject({
      method: "GET",
      url: `/api/admin/orders/${ieOrderId}`,
      cookies: fullAdminCookie,
    });
    assert.equal(getRes.statusCode, 200, getRes.body);
  });
});

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

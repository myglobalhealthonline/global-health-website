import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * Patient money-API route integration (contracts.md). Boots the full app and
 * injects requests: unauth → 401, success uses the okResponse envelope, errors
 * carry the documented codes. Skips when buildApp can't reach Postgres.
 */
describe("me/* subscription routes", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];
  let makeSubscriptionFixture: typeof import("../modules/subscriptions/test-support.js")["makeSubscriptionFixture"];
  const userIds: string[] = [];

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      makeSubscriptionFixture = (await import("../modules/subscriptions/test-support.js"))
        .makeSubscriptionFixture;
      app = await buildApp();
    } catch {
      // app stays null → every test skips (DB likely offline).
    }
  });

  after(async () => {
    if (app) {
      if (userIds.length > 0) {
        await prisma.userSubscription.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
      await app.close();
    }
  });

  async function makePatient(): Promise<{ cookie: Record<string, string>; userId: string }> {
    const user = await prisma.user.create({
      data: {
        email: `me-route-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`,
        passwordHash: "x",
        fullName: "Route Tester",
        role: "PATIENT",
      },
    });
    userIds.push(user.id);
    const token = signAuthToken({ sub: user.id, role: "PATIENT", email: user.email });
    return { cookie: { gh_auth: token }, userId: user.id };
  }

  it("GET /api/me/subscription without auth → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/me/subscription" });
    assert.equal(res.statusCode, 401);
    assert.equal(res.json().ok, false);
  });

  it("GET /api/me/credits without auth → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/me/credits" });
    assert.equal(res.statusCode, 401);
  });

  it("GET /api/me/subscription authed, no sub → 200 okResponse(null)", async (t) => {
    if (!app) return t.skip();
    const { cookie } = await makePatient();
    const res = await app.inject({ method: "GET", url: "/api/me/subscription", cookies: cookie });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true, "okResponse envelope");
    assert.equal(body.data, null, "no subscription");
  });

  it("GET /api/me/credits authed, no sub → zero balances", async (t) => {
    if (!app) return t.skip();
    const { cookie } = await makePatient();
    const res = await app.inject({ method: "GET", url: "/api/me/credits", cookies: cookie });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.ok, true);
    assert.equal(body.data.consultation.balance, 0);
    assert.equal(body.data.wellness.balance, 0);
    assert.deepEqual(body.data.ledger, []);
  });

  it("GET /api/me/credits reflects an active subscription's counter", async (t) => {
    if (!app) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "me-credits", {
      status: "ACTIVE",
      consultationBalance: 3,
      wellnessBalance: 2,
    });
    try {
      const token = signAuthToken({
        sub: fx.userId,
        role: "PATIENT",
        email: `me-credits-${fx.userId}@test.local`,
      });
      const res = await app.inject({
        method: "GET",
        url: "/api/me/credits",
        cookies: { gh_auth: token },
      });
      assert.equal(res.statusCode, 200);
      const body = res.json();
      assert.equal(body.data.consultation.balance, 3);
      assert.equal(body.data.wellness.balance, 2);
    } finally {
      await fx.cleanup();
    }
  });

  it("POST /api/me/subscription invalid body → 400", async (t) => {
    if (!app) return t.skip();
    const { cookie } = await makePatient();
    const res = await app.inject({
      method: "POST",
      url: "/api/me/subscription",
      cookies: cookie,
      payload: {},
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().ok, false);
  });

  it("POST /api/me/subscription/cancel with no active sub → 404 NO_ACTIVE_SUBSCRIPTION", async (t) => {
    if (!app) return t.skip();
    const { cookie } = await makePatient();
    const res = await app.inject({
      method: "POST",
      url: "/api/me/subscription/cancel",
      cookies: cookie,
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().details?.code, "NO_ACTIVE_SUBSCRIPTION");
  });

  it("GET /api/me/redemptions authed, no sub → empty kits", async (t) => {
    if (!app) return t.skip();
    const { cookie } = await makePatient();
    const res = await app.inject({ method: "GET", url: "/api/me/redemptions", cookies: cookie });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json().data.kits, []);
  });

  it("POST /api/me/redemptions with no sub → 404 NO_ACTIVE_SUBSCRIPTION", async (t) => {
    if (!app) return t.skip();
    const { cookie } = await makePatient();
    const res = await app.inject({
      method: "POST",
      url: "/api/me/redemptions",
      cookies: cookie,
      payload: {
        healthTestId: "whatever",
        shipName: "Jane",
        shipLine1: "1 St",
        shipCity: "Dublin",
        shipPostalCode: "D01",
        shipCountryCode: "ie",
      },
    });
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().details?.code, "NO_ACTIVE_SUBSCRIPTION");
  });
});

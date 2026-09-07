import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";

/**
 * TS-1: the four `cron-*.route.ts` files had no test of any kind. They are
 * internal, unauthenticated-by-session endpoints whose ONLY gate is the
 * `X-Cron-Token` header compared against `env.CRON_SECRET` — there is no
 * cookie, no role, and no rate limit behind them, so a regression in that one
 * comparison exposes bulk mailers and bulk status mutations to the internet.
 *
 * `reminders.route.ts` already pins the same gate for
 * `/api/internal/run-reminders` (reminders.route.test.ts) and is not repeated
 * here. This file covers every `/api/cron/*` endpoint instead:
 *
 *   POST /api/cron/abandoned-carts
 *   POST /api/cron/corporate/daily
 *   POST /api/cron/subscriptions
 *   POST /api/cron/subscriptions/daily
 *   POST /api/cron/trustpilot-invites
 *
 * Three properties per endpoint, and nothing else — no business logic:
 *   1. CRON_SECRET unset  → 503, fail CLOSED (never "unconfigured means open")
 *   2. wrong / missing token when it IS set → 401
 *   3. the right token gets past the gate
 *
 * `env` is a plain mutable object other suites already toggle at runtime
 * (authz-matrix.test.ts, medical-access-guard.test.ts); `CRON_SECRET` is unset
 * in .env.test, so it has to be set here and restored in `after()`.
 *
 * Deliberately NOT loading backend/.env — this runs against the isolated local
 * test cluster.
 */
describe("cron routes — X-Cron-Token gate", () => {
  let app: FastifyInstance | null = null;
  let envModule: (typeof import("../config/env.js"))["env"];
  let originalSecret: string | undefined;
  let bootError: unknown = null;

  const SECRET = "cron-authz-test-secret-value";

  const ENDPOINTS = [
    "/api/cron/abandoned-carts",
    "/api/cron/corporate/daily",
    "/api/cron/subscriptions",
    "/api/cron/subscriptions/daily",
    "/api/cron/trustpilot-invites",
  ] as const;

  const post = (url: string, token?: string) =>
    app!.inject({
      method: "POST",
      url,
      headers: token === undefined ? {} : { "x-cron-token": token },
      payload: {},
    });

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      envModule = (await import("../config/env.js")).env;
      app = await buildApp();
      const { prisma } = await import("../db/prisma.js");
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }
    originalSecret = envModule.CRON_SECRET;
  });

  after(async () => {
    if (!app) return;
    envModule.CRON_SECRET = originalSecret;
    await app.close();
  });

  for (const url of ENDPOINTS) {
    it(`${url} fails closed with no CRON_SECRET configured → 503`, async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      envModule.CRON_SECRET = undefined;
      const res = await post(url, SECRET);
      assert.equal(res.statusCode, 503, res.body);
    });

    it(`${url} rejects a missing token → 401`, async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      envModule.CRON_SECRET = SECRET;
      const res = await post(url);
      assert.equal(res.statusCode, 401, res.body);
    });

    it(`${url} rejects a wrong token → 401`, async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      envModule.CRON_SECRET = SECRET;
      const res = await post(url, `${SECRET}-not`);
      assert.equal(res.statusCode, 401, res.body);
    });

    it(`${url} lets the right token through`, async (t) => {
      if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
      envModule.CRON_SECRET = SECRET;
      const res = await post(url, SECRET);
      // The assertion is about the GATE, not the job: what must never happen
      // is the correct token being turned away. The body these jobs return
      // depends on rows in the database and is not this file's business.
      assert.notEqual(res.statusCode, 401, res.body);
      assert.notEqual(res.statusCode, 503, res.body);
    });
  }
});

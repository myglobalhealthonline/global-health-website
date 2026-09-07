import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";

/**
 * TS-1: `payments.route.ts` has a `*.test.ts` sibling
 * (`payments.checkout-label.test.ts`), but that file unit-tests one exported
 * helper — `buildAppointmentCheckoutProductData` — and never builds the app or
 * touches a route. Nothing pinned the three registrations themselves, which is
 * why this one is written despite the sibling.
 *
 * These endpoints have no session gate on purpose: guest checkout has no
 * account, and Stripe's webhook is not a user. Their access control is
 * therefore entirely "fail closed when unconfigured" plus signature
 * verification, and that is exactly what this file pins:
 *
 *   POST /api/payments/checkout-session  → 503 with no Stripe key
 *   POST /api/payments/sync-order        → 503 with no Stripe key
 *   POST /api/payments/webhook           → 503 with no webhook secret,
 *                                          400 with no / a bad signature
 *
 * The 400-on-bad-signature case is the one that matters: without it, an
 * unsigned POST could drive `payment_intent.succeeded` handling and mark
 * orders paid. `env` is a plain mutable object other suites already toggle at
 * runtime (authz-matrix.test.ts), so the configured-secret cases set the keys
 * here and restore them in `after()`.
 *
 * Deliberately NOT loading backend/.env — this runs against the isolated local
 * test cluster, which has no Stripe credentials.
 */
describe("payments route — fail-closed gates", () => {
  let app: FastifyInstance | null = null;
  let envModule: (typeof import("../config/env.js"))["env"];
  let bootError: unknown = null;

  let originalSecretKey: string | undefined;
  let originalWebhookSecret: string | undefined;

  const post = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
    app!.inject({ method: "POST", url, payload: payload as never, headers });

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
    originalSecretKey = envModule.STRIPE_SECRET_KEY;
    originalWebhookSecret = envModule.STRIPE_WEBHOOK_SECRET;
  });

  after(async () => {
    if (!app) return;
    envModule.STRIPE_SECRET_KEY = originalSecretKey;
    envModule.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    await app.close();
  });

  it("refuses to open a checkout session with no Stripe key → 503", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    envModule.STRIPE_SECRET_KEY = undefined;
    const res = await post("/api/payments/checkout-session", {
      appointmentId: "does-not-exist",
    });
    assert.equal(res.statusCode, 503, res.body);
  });

  it("refuses to sync an order with no Stripe key → 503", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    envModule.STRIPE_SECRET_KEY = undefined;
    const res = await post("/api/payments/sync-order", { orderId: "does-not-exist" });
    assert.equal(res.statusCode, 503, res.body);
  });

  it("refuses a webhook with no webhook secret configured → 503", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    envModule.STRIPE_WEBHOOK_SECRET = undefined;
    const res = await post("/api/payments/webhook", { type: "payment_intent.succeeded" });
    assert.equal(res.statusCode, 503, res.body);
  });

  it("refuses a webhook with no Stripe signature header → 400", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    envModule.STRIPE_SECRET_KEY = "sk_test_payments_authz_fixture";
    envModule.STRIPE_WEBHOOK_SECRET = "whsec_payments_authz_fixture";
    const res = await post("/api/payments/webhook", { type: "payment_intent.succeeded" });
    assert.equal(res.statusCode, 400, res.body);
  });

  it("refuses a webhook whose signature does not verify → 400", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    envModule.STRIPE_SECRET_KEY = "sk_test_payments_authz_fixture";
    envModule.STRIPE_WEBHOOK_SECRET = "whsec_payments_authz_fixture";
    const res = await post(
      "/api/payments/webhook",
      { type: "payment_intent.succeeded", data: { object: { id: "pi_forged" } } },
      { "stripe-signature": "t=1,v1=deadbeef" },
    );
    assert.equal(res.statusCode, 400, res.body);
  });
});

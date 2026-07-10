import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs } from "../test-utils/audit-cleanup.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * Sprint 2 admin plan-management route integration. Boots the full app and
 * injects requests: MANAGE_SUBSCRIPTIONS gate (401/403/200), plan create →
 * Stripe Price synced + audit row, deactivate-only delete, consultation-rule
 * country/PRESCRIPTION guards, manual adjust-credits idempotency, perk approve.
 * Skips when buildApp can't reach Postgres.
 */
describe("admin plan-management routes", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];

  const uniq = `p2-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let currencyId = "";
  let countryAId = "";
  let countryBId = "";
  let gpServiceId = "";
  let rxServiceId = "";
  let foreignServiceId = "";
  let superAdminId = "";
  let genericAdminId = "";
  let superCookie: Record<string, string> = {};
  let adminCookie: Record<string, string> = {};
  const createdPlanIds: string[] = [];

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      app = await buildApp();
    } catch {
      return; // app null → skip all
    }

    const currency = await prisma.currency.create({
      data: { code: `X${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const mkCountry = (suffix: string) =>
      prisma.country.create({
        data: {
          code: `${suffix}${uniq}`.slice(0, 8).toLowerCase(),
          name: `Plan Test ${suffix} ${uniq}`,
          slug: `plan-test-${suffix}-${uniq}`.toLowerCase(),
          legacyHomePath: `/lg-${suffix}-${uniq}`,
          teamPath: `/tm-${suffix}-${uniq}`,
          generalConsultationPath: `/gn-${suffix}-${uniq}`,
          specialistConsultationPath: `/sp-${suffix}-${uniq}`,
          currencyId: currency.id,
        },
      });
    const countryA = await mkCountry("a");
    const countryB = await mkCountry("b");
    countryAId = countryA.id;
    countryBId = countryB.id;

    const gp = await prisma.service.create({
      data: { countryId: countryA.id, kind: "GENERAL", slug: `gp-${uniq}`, name: "GP Consultation" },
    });
    const rx = await prisma.service.create({
      data: { countryId: countryA.id, kind: "PRESCRIPTION", slug: `rx-${uniq}`, name: "Prescription" },
    });
    const foreign = await prisma.service.create({
      data: { countryId: countryB.id, kind: "GENERAL", slug: `fr-${uniq}`, name: "Foreign GP" },
    });
    gpServiceId = gp.id;
    rxServiceId = rx.id;
    foreignServiceId = foreign.id;

    const superAdmin = await prisma.user.create({
      data: {
        email: `super-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Super Admin",
        role: "SUPER_ADMIN",
      },
    });
    const genericAdmin = await prisma.user.create({
      data: {
        email: `admin-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Generic Admin",
        role: "ADMIN",
      },
    });
    superAdminId = superAdmin.id;
    genericAdminId = genericAdmin.id;
    superCookie = { gh_auth: signAuthToken({ sub: superAdmin.id, role: "SUPER_ADMIN", email: superAdmin.email }) };
    adminCookie = { gh_auth: signAuthToken({ sub: genericAdmin.id, role: "ADMIN", email: genericAdmin.email }) };
  });

  after(async () => {
    if (!app) return;
    await deleteAuditLogs(prisma, { actorUserId: { in: [superAdminId, genericAdminId] } });
    await prisma.pricingPlan.deleteMany({ where: { countryId: { in: [countryAId, countryBId] } } });
    await prisma.service.deleteMany({ where: { countryId: { in: [countryAId, countryBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [superAdminId, genericAdminId] } } });
    await prisma.country.deleteMany({ where: { id: { in: [countryAId, countryBId] } } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  function planPayload(slug: string) {
    return {
      countryId: countryAId,
      slug,
      // planType is required at create (chosen once, immutable after).
      planType: "ESSENTIAL",
      name: "Essential Care",
      monthlyPriceCents: 2000,
      currencyCode: "eur",
      monthlyConsultationCredits: 1,
      // Inactive: the B9 partial unique allows only ONE active plan per
      // (country, tier) — these fixtures create many ESSENTIAL plans in the
      // same country, so they stay inactive (none of these tests depend on
      // catalogue visibility).
      isActive: false,
    };
  }

  async function createPlan(slug: string): Promise<string> {
    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/plans",
      cookies: superCookie,
      payload: planPayload(slug),
    });
    assert.equal(res.statusCode, 200, res.body);
    const id = res.json().data.plan.id as string;
    createdPlanIds.push(id);
    return id;
  }

  it("rejects unauthenticated access → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/admin/plans" });
    assert.equal(res.statusCode, 401);
  });

  it("allows any admin to manage subscriptions (single admin tier) → 200", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/admin/plans", cookies: adminCookie });
    assert.equal(res.statusCode, 200, res.body);
  });

  it("creates a plan, syncs a Stripe Price, and writes a PLAN_CREATED audit row", async (t) => {
    if (!app) return t.skip();
    const id = await createPlan(`essential-${uniq}`);
    const plan = await prisma.pricingPlan.findUnique({ where: { id } });
    assert.ok(plan, "plan persisted");
    assert.ok(plan!.stripePriceId, "stripePriceId synced (fake billing)");
    assert.ok(plan!.stripeProductId, "stripeProductId synced");
    const priceRow = await prisma.planStripePrice.findFirst({ where: { planId: id, active: true } });
    assert.ok(priceRow, "PlanStripePrice history row written");
    const audit = await prisma.auditLog.findFirst({
      where: { action: "PLAN_CREATED", entityId: id },
    });
    assert.ok(audit, "audit row written");
  });

  it("rejects a duplicate (country, slug) → 409", async (t) => {
    if (!app) return t.skip();
    const slug = `dup-${uniq}`;
    await createPlan(slug);
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/plans",
      cookies: superCookie,
      payload: planPayload(slug),
    });
    assert.equal(res.statusCode, 409);
  });

  it("rejects a second ACTIVE plan of the same (country, tier) → 409 (B9)", async (t) => {
    if (!app) return t.skip();
    const first = await app.inject({
      method: "POST",
      url: "/api/admin/plans",
      cookies: superCookie,
      payload: { ...planPayload(`tier-a-${uniq}`), isActive: true },
    });
    assert.equal(first.statusCode, 200, first.body);
    createdPlanIds.push(first.json().data.plan.id as string);

    const second = await app.inject({
      method: "POST",
      url: "/api/admin/plans",
      cookies: superCookie,
      payload: { ...planPayload(`tier-b-${uniq}`), isActive: true },
    });
    assert.equal(second.statusCode, 409, second.body);

    // Tier caps: ESSENTIAL allows at most 1 credit (6.1).
    const overCap = await app.inject({
      method: "POST",
      url: "/api/admin/plans",
      cookies: superCookie,
      payload: { ...planPayload(`tier-cap-${uniq}`), monthlyConsultationCredits: 2 },
    });
    assert.equal(overCap.statusCode, 400, overCap.body);
  });

  it("DELETE deactivates only (soft) — plan row survives with isActive=false", async (t) => {
    if (!app) return t.skip();
    const id = await createPlan(`deact-${uniq}`);
    const res = await app.inject({ method: "DELETE", url: `/api/admin/plans/${id}`, cookies: superCookie });
    assert.equal(res.statusCode, 200);
    const plan = await prisma.pricingPlan.findUnique({ where: { id } });
    assert.ok(plan, "plan NOT hard-deleted");
    assert.equal(plan!.isActive, false);
  });

  it("rejects a PRESCRIPTION service on a consultation rule → 400", async (t) => {
    if (!app) return t.skip();
    const id = await createPlan(`rxrule-${uniq}`);
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/plans/${id}/consultation-rules`,
      cookies: superCookie,
      payload: { serviceId: rxServiceId, isIncluded: true },
    });
    assert.equal(res.statusCode, 400);
  });

  it("rejects a cross-country service on a consultation rule → 400", async (t) => {
    if (!app) return t.skip();
    const id = await createPlan(`xrule-${uniq}`);
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/plans/${id}/consultation-rules`,
      cookies: superCookie,
      payload: { serviceId: foreignServiceId, isIncluded: true },
    });
    assert.equal(res.statusCode, 400);
  });

  it("accepts a same-country GENERAL service rule and stamps countryId", async (t) => {
    if (!app) return t.skip();
    const id = await createPlan(`okrule-${uniq}`);
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/plans/${id}/consultation-rules`,
      cookies: superCookie,
      payload: { serviceId: gpServiceId, isIncluded: true, usesCredits: true, creditsPerUse: 1 },
    });
    assert.equal(res.statusCode, 200, res.body);
    const rule = await prisma.planConsultationRule.findUnique({
      where: { planId_serviceId: { planId: id, serviceId: gpServiceId } },
    });
    assert.ok(rule);
    assert.equal(rule!.countryId, countryAId, "rule.countryId == plan.countryId");
  });

  it("manual adjust-credits is idempotent per requestId and updates the counter", async (t) => {
    if (!app) return t.skip();
    const planId = await createPlan(`adj-${uniq}`);
    const user = await prisma.user.create({
      data: { email: `adj-${uniq}@test.local`, passwordHash: "x", fullName: "Adj", role: "PATIENT" },
    });
    const sub = await prisma.userSubscription.create({
      data: { userId: user.id, planId, countryCode: "ie", status: "ACTIVE" },
    });
    try {
      const body = {
        kind: "CONSULTATION",
        delta: 2,
        reason: "ADJUSTMENT",
        note: "support: goodwill credit for outage",
        requestId: `req-${uniq}`,
      };
      const first = await app.inject({
        method: "POST",
        url: `/api/admin/subscriptions/${sub.id}/adjust-credits`,
        cookies: superCookie,
        payload: body,
      });
      assert.equal(first.statusCode, 200, first.body);
      assert.equal(first.json().data.balance, 2);
      // Replay with same requestId → idempotent, balance unchanged.
      const second = await app.inject({
        method: "POST",
        url: `/api/admin/subscriptions/${sub.id}/adjust-credits`,
        cookies: superCookie,
        payload: body,
      });
      assert.equal(second.statusCode, 200);
      assert.equal(second.json().data.balance, 2, "idempotent — not double-applied");
    } finally {
      await prisma.consultationCreditLedger.deleteMany({ where: { userId: user.id } });
      await prisma.subscriptionCreditBalance.deleteMany({ where: { userSubscriptionId: sub.id } });
      await prisma.userSubscription.deleteMany({ where: { id: sub.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });

  it("approves a pending per-subscriber perk grant", async (t) => {
    if (!app) return t.skip();
    const planId = await createPlan(`perk-${uniq}`);
    const user = await prisma.user.create({
      data: { email: `perk-${uniq}@test.local`, passwordHash: "x", fullName: "Perk", role: "PATIENT" },
    });
    const sub = await prisma.userSubscription.create({
      data: { userId: user.id, planId, countryCode: "ie", status: "ACTIVE" },
    });
    const grant = await prisma.subscriptionPerkGrant.create({
      data: { userSubscriptionId: sub.id, perkKey: "SPECIALIST_DISCOUNT", status: "PENDING" },
    });
    try {
      const queue = await app.inject({
        method: "GET",
        url: "/api/admin/subscription-perk-grants?status=PENDING",
        cookies: superCookie,
      });
      assert.equal(queue.statusCode, 200);
      assert.ok(queue.json().data.grants.some((g: { id: string }) => g.id === grant.id));

      const res = await app.inject({
        method: "POST",
        url: `/api/admin/subscription-perk-grants/${grant.id}/approve`,
        cookies: superCookie,
      });
      assert.equal(res.statusCode, 200, res.body);
      const updated = await prisma.subscriptionPerkGrant.findUnique({ where: { id: grant.id } });
      assert.equal(updated!.status, "APPROVED");
      assert.equal(updated!.approvedByAdminId, superAdminId);
    } finally {
      await prisma.subscriptionPerkGrant.deleteMany({ where: { userSubscriptionId: sub.id } });
      await prisma.userSubscription.deleteMany({ where: { id: sub.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });
});

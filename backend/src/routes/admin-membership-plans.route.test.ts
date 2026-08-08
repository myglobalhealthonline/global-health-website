import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs } from "../test-utils/audit-cleanup.js";
import { waitForAuditRow } from "../test-utils/wait-for-audit.js";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * Private membership plans — admin route integration (§16.2).
 *
 * Covers the two-tier authorization split (MANAGE_MEMBERSHIPS to read, a real
 * admin session to write), the rules that need a database and therefore cannot
 * live in the Zod schema — plan country lookup, the §6.6 commission-market
 * block, a benefit pinned to a foreign or non-consultation service, the level
 * delete guards — and the audit trail.
 *
 * Skips when buildApp can't reach Postgres, matching admin-plans.route.test.ts.
 */
describe("admin membership plan routes", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];

  const uniq = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const currencyCode = uniqueCurrencyCode();
  let currencyId = "";
  let countryAId = "";
  let countryBId = "";
  let commissionCountryId = "";
  let gpServiceId = "";
  let testKitServiceId = "";
  let foreignServiceId = "";
  let superAdminId = "";
  let genericAdminId = "";
  let localAdminId = "";
  let patientId = "";
  let superCookie: Record<string, string> = {};
  let adminCookie: Record<string, string> = {};
  let localAdminCookie: Record<string, string> = {};
  let patientCookie: Record<string, string> = {};

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
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const mkCountry = (suffix: string, extra: Record<string, unknown> = {}) =>
      prisma.country.create({
        data: {
          code: `${suffix}${uniq}`.slice(0, 8).toLowerCase(),
          name: `Membership Test ${suffix} ${uniq}`,
          slug: `membership-test-${suffix}-${uniq}`.toLowerCase(),
          legacyHomePath: `/mlg-${suffix}-${uniq}`,
          teamPath: `/mtm-${suffix}-${uniq}`,
          generalConsultationPath: `/mgn-${suffix}-${uniq}`,
          specialistConsultationPath: `/msp-${suffix}-${uniq}`,
          currencyId: currency.id,
          ...extra,
        },
      });
    const countryA = await mkCountry("a");
    const countryB = await mkCountry("b");
    // §6.6 — a commission market must refuse membership plans outright.
    const commissionCountry = await mkCountry("k", { commissionReceiptEnabled: true });
    countryAId = countryA.id;
    countryBId = countryB.id;
    commissionCountryId = commissionCountry.id;

    const gp = await prisma.service.create({
      data: { countryId: countryA.id, kind: "GENERAL", slug: `mgp-${uniq}`, name: "GP Consultation" },
    });
    const kit = await prisma.service.create({
      data: { countryId: countryA.id, kind: "HEALTH_TEST", slug: `mkit-${uniq}`, name: "Test Kit" },
    });
    const foreign = await prisma.service.create({
      data: { countryId: countryB.id, kind: "GENERAL", slug: `mfr-${uniq}`, name: "Foreign GP" },
    });
    gpServiceId = gp.id;
    testKitServiceId = kit.id;
    foreignServiceId = foreign.id;

    const mkUser = (label: string, role: "SUPER_ADMIN" | "ADMIN" | "LOCAL_ADMIN" | "PATIENT") =>
      prisma.user.create({
        data: {
          email: `${label}-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `Membership ${label}`,
          role,
        },
      });
    const superAdmin = await mkUser("super", "SUPER_ADMIN");
    const genericAdmin = await mkUser("admin", "ADMIN");
    const localAdmin = await mkUser("local", "LOCAL_ADMIN");
    const patient = await mkUser("patient", "PATIENT");
    superAdminId = superAdmin.id;
    genericAdminId = genericAdmin.id;
    localAdminId = localAdmin.id;
    patientId = patient.id;

    superCookie = {
      gh_auth: signAuthToken({ sub: superAdmin.id, role: "SUPER_ADMIN", email: superAdmin.email }),
    };
    adminCookie = {
      gh_auth: signAuthToken({ sub: genericAdmin.id, role: "ADMIN", email: genericAdmin.email }),
    };
    localAdminCookie = {
      gh_auth: signAuthToken({ sub: localAdmin.id, role: "LOCAL_ADMIN", email: localAdmin.email }),
    };
    patientCookie = {
      gh_auth: signAuthToken({ sub: patient.id, role: "PATIENT", email: patient.email }),
    };
  });

  after(async () => {
    if (!app) return;
    await deleteAuditLogs(prisma, {
      actorUserId: { in: [superAdminId, genericAdminId, localAdminId, patientId] },
    });
    const countryIds = [countryAId, countryBId, commissionCountryId];
    // Plan cascade removes levels, benefits and translations.
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: { in: countryIds } } });
    await prisma.service.deleteMany({ where: { countryId: { in: countryIds } } });
    await prisma.user.deleteMany({
      where: { id: { in: [superAdminId, genericAdminId, localAdminId, patientId] } },
    });
    await prisma.country.deleteMany({ where: { id: { in: countryIds } } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  const planPayload = (slug: string, countryId?: string) => ({
    countryId: countryId ?? countryAId,
    slug,
    name: `Membership ${slug}`,
  });

  async function createPlan(slug: string): Promise<{ planId: string; defaultLevelId: string }> {
    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/membership-plans",
      cookies: superCookie,
      payload: planPayload(slug),
    });
    assert.equal(res.statusCode, 200, res.body);
    const plan = res.json().data.plan;
    return { planId: plan.id as string, defaultLevelId: plan.levels[0].id as string };
  }

  /**
   * The admin plan pages render `plan.primaryCountry.name` and read
   * `plan.countries` for the coverage list. `tsc` proves the TYPES line up but
   * says nothing about what the route actually serialises, and a missing
   * relation renders as a blank field rather than an error — so the render
   * contract is pinned here, against the real route and a real database.
   */
  it("serves the primary country and the covered-country list on the detail payload", async (t) => {
    if (!app) return t.skip();
    const { planId } = await createPlan(`shape-${uniq}`);
    const res = await app.inject({
      method: "GET",
      url: `/api/admin/membership-plans/${planId}`,
      cookies: superCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const plan = res.json().data.plan;
    assert.equal(plan.primaryCountryId, countryAId);
    assert.equal(plan.primaryCountry?.id, countryAId, "the page renders primaryCountry.name");
    assert.deepEqual(
      plan.countries.map((c: { countryId: string }) => c.countryId),
      [countryAId],
      "a new plan covers exactly its primary country",
    );
    assert.ok(plan.countries[0].country?.code, "the country relation is expanded, not just its id");
  });

  it("scopes the plan list by COVERAGE, not by which country is primary", async (t) => {
    if (!app) return t.skip();
    const { planId } = await createPlan(`coverage-${uniq}`);
    // Country B is not covered yet, so the plan must not appear under it.
    const before = await app.inject({
      method: "GET",
      url: `/api/admin/membership-plans?countryId=${countryBId}`,
      cookies: superCookie,
    });
    assert.equal(
      before.json().data.plans.some((p: { id: string }) => p.id === planId),
      false,
    );

    await prisma!.membershipPlanCountry.create({
      data: { planId, countryId: countryBId },
    });
    const after = await app.inject({
      method: "GET",
      url: `/api/admin/membership-plans?countryId=${countryBId}`,
      cookies: superCookie,
    });
    assert.equal(
      after.json().data.plans.some((p: { id: string }) => p.id === planId),
      true,
      "a plan covering B belongs on B's list even though its primary is A",
    );
  });

  // ─── Authorization matrix (§4.2) ───────────────────────────────────────────

  it("rejects unauthenticated reads → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/admin/membership-plans" });
    assert.equal(res.statusCode, 401);
  });

  it("rejects a patient session → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-plans",
      cookies: patientCookie,
    });
    assert.equal(res.statusCode, 403);
  });

  it("rejects LOCAL_ADMIN — member PII spans the whole plan → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-plans",
      cookies: localAdminCookie,
    });
    assert.equal(res.statusCode, 403);
  });

  it("allows a plain ADMIN to read the plan list → 200", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-plans",
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  it("allows a plain ADMIN a config write — SUPER_ADMIN is not required (§4.2)", async (t) => {
    if (!app) return t.skip();
    const slug = `admin-allowed-${uniq}`;
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-plans",
      cookies: adminCookie,
      payload: planPayload(slug),
    });
    // 200, not 201 — okResponse() is the convention for every admin write here.
    assert.equal(res.statusCode, 200, res.body);
    const written = await prisma.membershipPlan.findFirst({ where: { slug } });
    assert.ok(written, "the plan is written");
    await prisma.membershipPlan.deleteMany({ where: { slug } });
  });

  // ─── Plans ─────────────────────────────────────────────────────────────────

  it("creates a plan with an implicit default level and an audit row (decision 2)", async (t) => {
    if (!app) return t.skip();
    const { planId, defaultLevelId } = await createPlan(`gold-${uniq}`);
    const levels = await prisma.membershipLevel.findMany({ where: { planId } });
    assert.equal(levels.length, 1, "one implicit level");
    assert.equal(levels[0].id, defaultLevelId);
    assert.equal(levels[0].isDefault, true);
    // A level no longer carries a country — it spans the plan's covered ones
    // (§21.2). What the plan DOES get at creation is a coverage row for its
    // primary country, which is what makes it configurable at all (§21.1).
    const covered = await prisma.membershipPlanCountry.findMany({ where: { planId } });
    assert.deepEqual(
      covered.map((c) => c.countryId),
      [countryAId],
      "the primary country's coverage row is created with the plan",
    );
    const audit = await waitForAuditRow(() =>
      prisma.auditLog.findFirst({
        where: { action: "MEMBERSHIP_PLAN_CREATED", entityId: planId },
      }),
    );
    assert.ok(audit, "audit row written");
  });

  it("refuses a plan in a commission-model country → 422 (§6.6)", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-plans",
      cookies: superCookie,
      payload: planPayload(`commission-${uniq}`, commissionCountryId),
    });
    assert.equal(res.statusCode, 422, res.body);
  });

  it("rejects an unknown country → 400", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-plans",
      cookies: superCookie,
      payload: planPayload(`nocountry-${uniq}`, "country-that-does-not-exist"),
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it("rejects a duplicate (country, slug) → 409", async (t) => {
    if (!app) return t.skip();
    const slug = `dup-${uniq}`;
    await createPlan(slug);
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-plans",
      cookies: superCookie,
      payload: planPayload(slug),
    });
    assert.equal(res.statusCode, 409, res.body);
  });

  it("deactivates rather than deletes, keeping the row (§17)", async (t) => {
    if (!app) return t.skip();
    const { planId } = await createPlan(`deact-${uniq}`);
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/membership-plans/${planId}/deactivate`,
      cookies: superCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    assert.ok(plan, "row retained");
    assert.equal(plan!.isActive, false);
  });

  // ─── Levels ────────────────────────────────────────────────────────────────

  it("creates a sibling level, which spans the plan's countries rather than one", async (t) => {
    if (!app) return t.skip();
    const { planId } = await createPlan(`levels-${uniq}`);
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/membership-plans/${planId}/levels`,
      cookies: superCookie,
      payload: { slug: "silver", name: "Silver", familyEnabled: true, maxDependents: 2 },
    });
    assert.equal(res.statusCode, 200, res.body);
    const level = res.json().data.level;
    // Phase 7: a level carries no country at all — its BENEFIT rows are what
    // is per-country (§21.2/§21.3).
    assert.equal(level.countryId, undefined);
    assert.equal(level.planId, planId);
    assert.equal(level.isDefault, false, "only the implicit level is the default");
  });

  it("rejects raising maxDependents without familyEnabled on update → 400", async (t) => {
    if (!app) return t.skip();
    const { defaultLevelId } = await createPlan(`family-${uniq}`);
    const res = await app.inject({
      method: "PATCH",
      url: `/api/admin/membership-levels/${defaultLevelId}`,
      cookies: superCookie,
      payload: { maxDependents: 3 },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it("refuses to delete a plan's last level → 409", async (t) => {
    if (!app) return t.skip();
    const { defaultLevelId } = await createPlan(`lastlevel-${uniq}`);
    const res = await app.inject({
      method: "DELETE",
      url: `/api/admin/membership-levels/${defaultLevelId}`,
      cookies: superCookie,
    });
    assert.equal(res.statusCode, 409, res.body);
  });

  it("promotes a sibling to default when the default level is deleted", async (t) => {
    if (!app) return t.skip();
    const { planId, defaultLevelId } = await createPlan(`promote-${uniq}`);
    const sibling = await app.inject({
      method: "POST",
      url: `/api/admin/membership-plans/${planId}/levels`,
      cookies: superCookie,
      payload: { slug: "silver", name: "Silver" },
    });
    assert.equal(sibling.statusCode, 200, sibling.body);

    const res = await app.inject({
      method: "DELETE",
      url: `/api/admin/membership-levels/${defaultLevelId}`,
      cookies: superCookie,
    });
    assert.equal(res.statusCode, 200, res.body);

    const remaining = await prisma.membershipLevel.findMany({ where: { planId } });
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].isDefault, true, "the survivor became the default");
  });

  // ─── Benefits ──────────────────────────────────────────────────────────────

  it("creates a kind-targeted allowance benefit with a fallback", async (t) => {
    if (!app) return t.skip();
    const { defaultLevelId } = await createPlan(`benefit-${uniq}`);
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/membership-levels/${defaultLevelId}/benefits`,
      cookies: superCookie,
      payload: {
        serviceKind: "GENERAL",
        benefitType: "ALLOWANCE",
        allowanceCount: 4,
        fallbackType: "PERCENT",
        fallbackPercent: 20,
      },
    });
    assert.equal(res.statusCode, 200, res.body);
    const benefit = res.json().data.benefit;
    assert.equal(benefit.countryId, countryAId, "benefit inherits the level's country");
    assert.equal(benefit.allowanceCount, 4);
    const audit = await waitForAuditRow(() =>
      prisma.auditLog.findFirst({
        where: { action: "MEMBERSHIP_BENEFIT_CREATED", entityId: benefit.id },
      }),
    );
    assert.ok(audit, "audit row written");
  });

  it("rejects a benefit pinned to another country's service → 400", async (t) => {
    if (!app) return t.skip();
    const { defaultLevelId } = await createPlan(`foreignsvc-${uniq}`);
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/membership-levels/${defaultLevelId}/benefits`,
      cookies: superCookie,
      payload: { serviceId: foreignServiceId, benefitType: "PERCENT", percentOff: 20 },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it("rejects a benefit on a non-consultation service → 400 (§18)", async (t) => {
    if (!app) return t.skip();
    const { defaultLevelId } = await createPlan(`kitsvc-${uniq}`);
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/membership-levels/${defaultLevelId}/benefits`,
      cookies: superCookie,
      payload: { serviceId: testKitServiceId, benefitType: "PERCENT", percentOff: 20 },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it("rejects a benefit targeting both a kind and a service → 400", async (t) => {
    if (!app) return t.skip();
    const { defaultLevelId } = await createPlan(`bothtarget-${uniq}`);
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/membership-levels/${defaultLevelId}/benefits`,
      cookies: superCookie,
      payload: {
        serviceKind: "GENERAL",
        serviceId: gpServiceId,
        benefitType: "PERCENT",
        percentOff: 20,
      },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it("rejects a second benefit for the same service kind on one level → 409", async (t) => {
    if (!app) return t.skip();
    const { defaultLevelId } = await createPlan(`dupkind-${uniq}`);
    const payload = { serviceKind: "GENERAL", benefitType: "PERCENT", percentOff: 20 };
    const first = await app.inject({
      method: "POST",
      url: `/api/admin/membership-levels/${defaultLevelId}/benefits`,
      cookies: superCookie,
      payload,
    });
    assert.equal(first.statusCode, 200, first.body);
    const second = await app.inject({
      method: "POST",
      url: `/api/admin/membership-levels/${defaultLevelId}/benefits`,
      cookies: superCookie,
      payload,
    });
    assert.equal(second.statusCode, 409, second.body);
  });

  it("clears the columns a changed benefit type no longer uses", async (t) => {
    if (!app) return t.skip();
    const { defaultLevelId } = await createPlan(`retype-${uniq}`);
    const created = await app.inject({
      method: "POST",
      url: `/api/admin/membership-levels/${defaultLevelId}/benefits`,
      cookies: superCookie,
      payload: {
        serviceKind: "SPECIALIST",
        benefitType: "ALLOWANCE",
        allowanceCount: 3,
        fallbackType: "FIXED",
        fallbackFixedCents: 3000,
      },
    });
    assert.equal(created.statusCode, 200, created.body);
    const benefitId = created.json().data.benefit.id as string;

    const updated = await app.inject({
      method: "PATCH",
      url: `/api/admin/membership-benefits/${benefitId}`,
      cookies: superCookie,
      payload: { serviceKind: "SPECIALIST", benefitType: "PERCENT", percentOff: 15 },
    });
    assert.equal(updated.statusCode, 200, updated.body);
    const row = await prisma.membershipBenefit.findUnique({ where: { id: benefitId } });
    assert.equal(row!.percentOff, 15);
    assert.equal(row!.allowanceCount, null, "stale allowance cleared");
    assert.equal(row!.fallbackType, "NONE");
    assert.equal(row!.fallbackFixedCents, null, "stale fallback cleared");
  });

  // ─── Translations ──────────────────────────────────────────────────────────

  it("saves a plan translation for an enabled locale", async (t) => {
    if (!app) return t.skip();
    const { planId } = await createPlan(`i18n-${uniq}`);
    await prisma.countryLocale.create({ data: { countryId: countryAId, locale: "PT" } });
    const res = await app.inject({
      method: "PUT",
      url: `/api/admin/membership-plans/${planId}/translations/PT`,
      cookies: superCookie,
      payload: { name: "Plano MEMS", description: "Descrição" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const row = await prisma.membershipPlanTranslation.findUnique({
      where: { planId_locale: { planId, locale: "PT" } },
    });
    assert.equal(row!.name, "Plano MEMS");
  });

  it("rejects a translation for a locale the country has not enabled → 400", async (t) => {
    if (!app) return t.skip();
    const { planId } = await createPlan(`i18nbad-${uniq}`);
    const res = await app.inject({
      method: "PUT",
      url: `/api/admin/membership-plans/${planId}/translations/RO`,
      cookies: superCookie,
      payload: { name: "Nope" },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  /* ── Card colour (§24.2, decision 45) ───────────────────────────────────── */

  it("stores a valid card background on the level", async (t) => {
    if (!app) return t.skip();
    const { defaultLevelId } = await createPlan(`cardok-${uniq}`);
    const res = await app.inject({
      method: "PATCH",
      url: `/api/admin/membership-levels/${defaultLevelId}`,
      cookies: superCookie,
      payload: { cardBackgroundHex: "#0B3D2E" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const row = await prisma.membershipLevel.findUnique({ where: { id: defaultLevelId } });
    assert.equal(row!.cardBackgroundHex, "#0B3D2E");
  });

  it("rejects an invalid card background → 400, never a constraint violation", async (t) => {
    if (!app) return t.skip();
    // The column carries a CHECK. Without the Zod rule these surface as a 500
    // from the database rather than a field error the admin can act on.
    const { defaultLevelId } = await createPlan(`cardbad-${uniq}`);
    // Bound outside the loop: `app`'s narrowing does not survive into one, and
    // the self-referential inference that follows is a TS7022, not a real type.
    const server = app;
    for (const bad of ["#fff", "0B3D2E", "#12345g", "rebeccapurple", "#0B3D2E00"]) {
      const res = await server.inject({
        method: "PATCH",
        url: `/api/admin/membership-levels/${defaultLevelId}`,
        cookies: superCookie,
        payload: { cardBackgroundHex: bad },
      });
      assert.equal(res.statusCode, 400, `${bad} should be rejected: ${res.body}`);
    }
    const row = await prisma.membershipLevel.findUnique({ where: { id: defaultLevelId } });
    assert.equal(row!.cardBackgroundHex, null, "a rejected colour must not be written");
  });

  it("clears the card colour back to the default face with null", async (t) => {
    if (!app) return t.skip();
    const { defaultLevelId } = await createPlan(`cardnull-${uniq}`);
    await app.inject({
      method: "PATCH",
      url: `/api/admin/membership-levels/${defaultLevelId}`,
      cookies: superCookie,
      payload: { cardBackgroundHex: "#F5F0E6" },
    });
    const res = await app.inject({
      method: "PATCH",
      url: `/api/admin/membership-levels/${defaultLevelId}`,
      cookies: superCookie,
      payload: { cardBackgroundHex: null },
    });
    assert.equal(res.statusCode, 200, res.body);
    const row = await prisma.membershipLevel.findUnique({ where: { id: defaultLevelId } });
    assert.equal(row!.cardBackgroundHex, null);
  });

  it("returns 404 for a level under a plan that does not exist", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-plans/plan-that-does-not-exist/levels",
      cookies: superCookie,
      payload: { slug: "ghost", name: "Ghost" },
    });
    assert.equal(res.statusCode, 404, res.body);
  });
});

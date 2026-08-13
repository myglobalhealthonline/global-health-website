import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * Sprint 3 public pricing read API. GET /api/countries/:code/plans serves the
 * anonymous pricing page: strict subscriptions gate (404 when off), active
 * plans only, data-driven perkUnlockMonths, locale resolution. Skips when
 * buildApp can't reach Postgres.
 */
describe("public country plans route", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;

  const uniq = `p3-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const currencyCode = uniqueCurrencyCode();
  let currencyId = "";
  let enabledCountryId = "";
  let disabledCountryId = "";
  let inactiveCountryId = "";
  let enabledCode = "";
  let disabledCode = "";
  let inactiveCode = "";

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      app = await buildApp();
    } catch {
      return; // app null → skip all
    }

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;

    enabledCode = `on${uniq}`.slice(0, 8).toLowerCase();
    disabledCode = `off${uniq}`.slice(0, 8).toLowerCase();
    inactiveCode = `ia${uniq}`.slice(0, 8).toLowerCase();

    const enabled = await prisma.country.create({
      data: {
        code: enabledCode,
        name: `Plans On ${uniq}`,
        slug: `plans-on-${uniq}`.toLowerCase(),
        legacyHomePath: `/on-${uniq}`,
        teamPath: `/on-tm-${uniq}`,
        generalConsultationPath: `/on-gn-${uniq}`,
        specialistConsultationPath: `/on-sp-${uniq}`,
        currencyId: currency.id,
        enabledFeatures: ["subscriptions"],
      },
    });
    const disabled = await prisma.country.create({
      data: {
        code: disabledCode,
        name: `Plans Off ${uniq}`,
        slug: `plans-off-${uniq}`.toLowerCase(),
        legacyHomePath: `/off-${uniq}`,
        teamPath: `/off-tm-${uniq}`,
        generalConsultationPath: `/off-gn-${uniq}`,
        specialistConsultationPath: `/off-sp-${uniq}`,
        currencyId: currency.id,
        enabledFeatures: ["services"], // explicitly omits subscriptions
      },
    });
    const inactive = await prisma.country.create({
      data: {
        code: inactiveCode,
        name: `Plans Inactive ${uniq}`,
        slug: `plans-inactive-${uniq}`.toLowerCase(),
        legacyHomePath: `/ia-${uniq}`,
        teamPath: `/ia-tm-${uniq}`,
        generalConsultationPath: `/ia-gn-${uniq}`,
        specialistConsultationPath: `/ia-sp-${uniq}`,
        currencyId: currency.id,
        enabledFeatures: ["subscriptions"],
        isActive: false,
      },
    });
    enabledCountryId = enabled.id;
    disabledCountryId = disabled.id;
    inactiveCountryId = inactive.id;

    const active = await prisma.pricingPlan.create({
      data: {
        countryId: enabled.id,
        slug: `essential-${uniq}`,
        name: "Essential Care",
        monthlyPriceCents: 2000,
        currencyCode: "eur",
        monthlyConsultationCredits: 1,
        displayOrder: 1,
        isActive: true,
      },
    });
    // A gated specialist-discount perk → perkUnlockMonths must derive to 2.
    await prisma.planPerkRule.create({
      data: {
        planId: active.id,
        perkKey: "SPECIALIST_DISCOUNT",
        unlockMode: "AFTER_PAID_MONTHS",
        unlockAfterPaidMonths: 2,
      },
    });
    // Inactive plan must NOT appear.
    await prisma.pricingPlan.create({
      data: {
        countryId: enabled.id,
        slug: `hidden-${uniq}`,
        name: "Hidden Plan",
        monthlyPriceCents: 9900,
        currencyCode: "eur",
        isActive: false,
      },
    });
  });

  after(async () => {
    if (!app) return;
    await prisma.pricingPlan.deleteMany({
      where: { countryId: { in: [enabledCountryId, disabledCountryId, inactiveCountryId] } },
    });
    await prisma.country.deleteMany({
      where: { id: { in: [enabledCountryId, disabledCountryId, inactiveCountryId] } },
    });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  it("404s a country without the subscriptions flag", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: `/api/countries/${disabledCode}/plans` });
    assert.equal(res.statusCode, 404);
  });

  it("404s an inactive country even when subscriptions is enabled", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: `/api/countries/${inactiveCode}/plans` });
    assert.equal(res.statusCode, 404);
  });

  it("returns active plans for an opted-in country with data-driven perkUnlockMonths", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: `/api/countries/${enabledCode}/plans` });
    assert.equal(res.statusCode, 200, res.body);
    const plans = res.json().data.plans as Array<{
      slug: string;
      monthlyPriceCents: number;
      perkUnlockMonths: number | null;
      monthlyConsultationCredits: number;
    }>;
    assert.equal(plans.length, 1, "only the active plan is returned");
    assert.equal(plans[0].slug, `essential-${uniq}`);
    assert.equal(plans[0].monthlyConsultationCredits, 1);
    assert.equal(plans[0].perkUnlockMonths, 2, "derived from the live perk rule, not hardcoded");
  });

  it("404s an unknown country", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: `/api/countries/zzxqno/plans` });
    assert.equal(res.statusCode, 404);
  });
});

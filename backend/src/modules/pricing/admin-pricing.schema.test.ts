import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminPricingCreateBodySchema,
  adminPricingQuerySchema,
  pricingSlugSchema,
} from "../../validations/admin-pricing.schema.js";

describe("admin pricing validation", () => {
  it("rejects invalid slug", () => {
    assert.equal(pricingSlugSchema.safeParse("Bad").success, false);
    assert.equal(pricingSlugSchema.safeParse("annual-plan").success, true);
  });

  it("create rejects negative priceCents", () => {
    const result = adminPricingCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "basic",
      name: "Basic",
      priceCents: -100,
      currencyCode: "EUR",
      interval: "month",
    });
    assert.equal(result.success, false);
  });

  it("create rejects missing countryId", () => {
    const result = adminPricingCreateBodySchema.safeParse({
      slug: "basic",
      name: "Basic",
      priceCents: 0,
      currencyCode: "EUR",
      interval: "month",
    });
    assert.equal(result.success, false);
  });

  it("create accepts valid payload", () => {
    const result = adminPricingCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "pro-plan",
      name: "Pro",
      description: "For teams",
      priceCents: 9900,
      currencyCode: "EUR",
      interval: "year",
      isActive: true,
    });
    assert.equal(result.success, true);
  });

  it("query schema parses filters", () => {
    const result = adminPricingQuerySchema.safeParse({
      page: "2",
      pageSize: "15",
      countryCode: "ie",
      isActive: "false",
      search: "pro",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.page, 2);
      assert.equal(result.data.countryCode, "ie");
      assert.equal(result.data.isActive, false);
      assert.equal(result.data.search, "pro");
    }
  });

  it("duplicate countryId+slug enforced by DB unique index (not Zod)", () => {
    const a = adminPricingCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "same",
      name: "A",
      priceCents: 1,
      currencyCode: "EUR",
      interval: "once",
    });
    const b = adminPricingCreateBodySchema.safeParse({
      countryId: "c1",
      slug: "same",
      name: "B",
      priceCents: 2,
      currencyCode: "EUR",
      interval: "once",
    });
    assert.equal(a.success, true);
    assert.equal(b.success, true);
  });
});

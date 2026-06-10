import assert from "node:assert";
import { describe, it } from "node:test";
import { peakPricingSchema } from "./admin-service-pricing.schema.js";

const valid = {
  enabled: true,
  peakStartMinute: 18 * 60,
  peakEndMinute: 22 * 60,
  peakPriceCents: 4900,
  offPeakPriceCents: 3900,
  currencyCode: "eur",
};

describe("peakPricingSchema", () => {
  it("accepts a valid payload and uppercases the currency", () => {
    const r = peakPricingSchema.safeParse(valid);
    assert.equal(r.success, true);
    assert.equal(r.data?.currencyCode, "EUR");
  });

  it("rejects end <= start", () => {
    const r = peakPricingSchema.safeParse({
      ...valid,
      peakStartMinute: 22 * 60,
      peakEndMinute: 18 * 60,
    });
    assert.equal(r.success, false);
  });

  it("rejects negative prices", () => {
    const r = peakPricingSchema.safeParse({ ...valid, peakPriceCents: -1 });
    assert.equal(r.success, false);
  });

  it("rejects a non-3-letter currency", () => {
    const r = peakPricingSchema.safeParse({ ...valid, currencyCode: "EU" });
    assert.equal(r.success, false);
  });

  it("rejects minute-of-day out of range", () => {
    const r = peakPricingSchema.safeParse({ ...valid, peakEndMinute: 9999 });
    assert.equal(r.success, false);
  });
});

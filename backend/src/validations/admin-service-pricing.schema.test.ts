import assert from "node:assert";
import { describe, it } from "node:test";
import { peakPricingSchema } from "./admin-service-pricing.schema.js";

const valid = {
  enabled: true,
  peakPriceCents: 4900,
  offPeakPriceCents: 3900,
  currencyCode: "eur",
  windows: [{ startMinute: 18 * 60, endMinute: 22 * 60 }],
};

describe("peakPricingSchema", () => {
  it("accepts a valid payload and uppercases the currency", () => {
    const r = peakPricingSchema.safeParse(valid);
    assert.equal(r.success, true);
    assert.equal(r.data?.currencyCode, "EUR");
  });

  it("rejects a window end <= start", () => {
    const r = peakPricingSchema.safeParse({
      ...valid,
      windows: [{ startMinute: 22 * 60, endMinute: 18 * 60 }],
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

  it("rejects a window minute-of-day out of range", () => {
    const r = peakPricingSchema.safeParse({
      ...valid,
      windows: [{ startMinute: 18 * 60, endMinute: 9999 }],
    });
    assert.equal(r.success, false);
  });
});

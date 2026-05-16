import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reviewSettingsSchema } from "./admin-settings.schema.js";

describe("review settings validation", () => {
  it("accepts an empty patch", () => {
    const r = reviewSettingsSchema.safeParse({});
    assert.equal(r.success, true);
  });

  it("accepts all three provider IDs + aggregates + primary", () => {
    const r = reviewSettingsSchema.safeParse({
      trustpilot: {
        businessUnitId: "4f1a8a1c0000ff000abc1234",
        aggregate: { rating: 4.94, count: 2000 },
      },
      google: {
        placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4",
        aggregate: { rating: 4.8, count: 350 },
      },
      doctify: {
        clinicId: "global-health",
        aggregate: { rating: 4.95, count: 120 },
      },
      primaryProvider: "TRUSTPILOT",
    });
    assert.equal(r.success, true);
  });

  it("rejects rating above 5", () => {
    const r = reviewSettingsSchema.safeParse({
      trustpilot: { aggregate: { rating: 5.5, count: 10 } },
    });
    assert.equal(r.success, false);
  });

  it("rejects negative rating", () => {
    const r = reviewSettingsSchema.safeParse({
      google: { aggregate: { rating: -1, count: 10 } },
    });
    assert.equal(r.success, false);
  });

  it("rejects non-integer count", () => {
    const r = reviewSettingsSchema.safeParse({
      google: { aggregate: { rating: 4.0, count: 12.5 } },
    });
    assert.equal(r.success, false);
  });

  it("rejects unknown primaryProvider", () => {
    const r = reviewSettingsSchema.safeParse({
      primaryProvider: "YELP",
    });
    assert.equal(r.success, false);
  });

  it("accepts null primaryProvider to clear the pick", () => {
    const r = reviewSettingsSchema.safeParse({ primaryProvider: null });
    assert.equal(r.success, true);
  });

  it("accepts null provider IDs to delete the underlying setting", () => {
    const r = reviewSettingsSchema.safeParse({
      trustpilot: { businessUnitId: null },
      google: { placeId: null },
      doctify: { clinicId: null },
    });
    assert.equal(r.success, true);
  });

  it("accepts null aggregate to clear the aggregate row", () => {
    const r = reviewSettingsSchema.safeParse({
      trustpilot: { aggregate: null },
    });
    assert.equal(r.success, true);
  });

  it("coerces numeric strings into numbers (admin form inputs are strings)", () => {
    const r = reviewSettingsSchema.safeParse({
      trustpilot: { aggregate: { rating: "4.94", count: "2000" } },
    });
    assert.equal(r.success, true);
    if (r.success) {
      assert.equal(r.data.trustpilot?.aggregate?.rating, 4.94);
      assert.equal(r.data.trustpilot?.aggregate?.count, 2000);
    }
  });

  it("rejects an ID longer than 120 chars", () => {
    const tooLong = "x".repeat(121);
    const r = reviewSettingsSchema.safeParse({
      trustpilot: { businessUnitId: tooLong },
    });
    assert.equal(r.success, false);
  });
});

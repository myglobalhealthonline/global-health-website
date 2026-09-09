import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { shouldSendMetaCapiPurchase } from "./meta-capi-dispatch.service.js";

describe("shouldSendMetaCapiPurchase", () => {
  it("sends when marketing consent was given and the order has a value", () => {
    assert.equal(
      shouldSendMetaCapiPurchase({
        totalCents: 4200,
        adAttribution: { marketingConsent: true },
      }),
      true,
    );
  });

  it("skips when marketing consent was declined", () => {
    assert.equal(
      shouldSendMetaCapiPurchase({
        totalCents: 4200,
        adAttribution: { marketingConsent: false },
      }),
      false,
    );
  });

  it("skips when the order predates this feature (no adAttribution at all)", () => {
    assert.equal(shouldSendMetaCapiPurchase({ totalCents: 4200, adAttribution: null }), false);
  });

  it("skips a zero-total order even with consent — not ad-driven revenue", () => {
    assert.equal(
      shouldSendMetaCapiPurchase({
        totalCents: 0,
        adAttribution: { marketingConsent: true },
      }),
      false,
    );
  });
});

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { orderAdCampaign, orderAdSource } from "./order-ad-source.js";

describe("orderAdSource", () => {
  it("returns META for an order carrying a Facebook click id", () => {
    assert.equal(orderAdSource({ marketingConsent: true, fbclid: "IwAR123" }), "META");
  });

  it("returns META when only the _fbc cookie survived (click id stripped from the URL)", () => {
    assert.equal(orderAdSource({ fbc: "fb.1.1700000000.IwAR123" }), "META");
  });

  it("returns META for Meta utm sources regardless of case", () => {
    for (const source of ["facebook", "Instagram", "META", "fb", "ig"]) {
      assert.equal(orderAdSource({ utmSource: source }), "META", source);
    }
  });

  it("returns null for organic, direct and non-Meta paid traffic", () => {
    assert.equal(orderAdSource(null), null);
    assert.equal(orderAdSource(undefined), null);
    assert.equal(orderAdSource({}), null);
    assert.equal(orderAdSource({ marketingConsent: true }), null);
    assert.equal(orderAdSource({ utmSource: "google", gclid: "abc" }), null);
    assert.equal(orderAdSource({ utmSource: "newsletter" }), null);
  });

  it("ignores blank strings rather than treating them as a click", () => {
    assert.equal(orderAdSource({ fbclid: "   ", fbc: "" }), null);
  });

  it("tolerates a non-object blob without throwing", () => {
    assert.equal(orderAdSource("fbclid=1"), null);
    assert.equal(orderAdSource(42), null);
  });
});

describe("orderAdCampaign", () => {
  it("returns only the campaign fields, never the tracking identifiers", () => {
    const campaign = orderAdCampaign({
      marketingConsent: true,
      fbclid: "IwAR123",
      fbp: "fb.1.2.3",
      clientIp: "203.0.113.4",
      clientUserAgent: "Mozilla/5.0",
      utmSource: "facebook",
      utmMedium: "paid_social",
      utmCampaign: "cz-gp-sept",
      landingPath: "/cz/en/services",
    });
    assert.deepEqual(campaign, {
      utmSource: "facebook",
      utmMedium: "paid_social",
      utmCampaign: "cz-gp-sept",
      landingPath: "/cz/en/services",
    });
  });

  it("returns null when the blob carries no campaign fields at all", () => {
    assert.equal(orderAdCampaign({ marketingConsent: true, fbclid: "IwAR123" }), null);
    assert.equal(orderAdCampaign(null), null);
  });
});

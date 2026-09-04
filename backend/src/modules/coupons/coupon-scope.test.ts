import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { couponAppliesToAnyLine, couponAppliesToKind } from "./coupon-scope.js";

/**
 * Pure rules, no DB. What these pin down is that ANY stays permissive — every
 * coupon minted before scoping existed carries it, and a regression here would
 * silently narrow codes already in customers' inboxes.
 */
describe("couponAppliesToKind", () => {
  it("lets ANY cover every line kind", () => {
    for (const kind of [
      "GENERAL_CONSULTATION",
      "SPECIALIST_CONSULTATION",
      "HEALTH_TEST",
      "PRESCRIPTION_SERVICE",
      "LAB_EXAM",
    ] as const) {
      assert.equal(couponAppliesToKind("ANY", kind), true, kind);
    }
  });

  it("restricts GENERAL_CONSULTATION to GP lines", () => {
    assert.equal(couponAppliesToKind("GENERAL_CONSULTATION", "GENERAL_CONSULTATION"), true);
    assert.equal(couponAppliesToKind("GENERAL_CONSULTATION", "SPECIALIST_CONSULTATION"), false);
    assert.equal(couponAppliesToKind("GENERAL_CONSULTATION", "HEALTH_TEST"), false);
  });

  it("restricts SPECIALIST_CONSULTATION to specialist lines", () => {
    assert.equal(couponAppliesToKind("SPECIALIST_CONSULTATION", "SPECIALIST_CONSULTATION"), true);
    assert.equal(couponAppliesToKind("SPECIALIST_CONSULTATION", "GENERAL_CONSULTATION"), false);
  });

  it("lets CONSULTATIONS cover both kinds but nothing else", () => {
    assert.equal(couponAppliesToKind("CONSULTATIONS", "GENERAL_CONSULTATION"), true);
    assert.equal(couponAppliesToKind("CONSULTATIONS", "SPECIALIST_CONSULTATION"), true);
    assert.equal(couponAppliesToKind("CONSULTATIONS", "HEALTH_TEST"), false);
    assert.equal(couponAppliesToKind("CONSULTATIONS", "LAB_EXAM"), false);
  });
});

describe("couponAppliesToAnyLine", () => {
  it("is true when a mixed basket holds one line in scope", () => {
    assert.equal(
      couponAppliesToAnyLine("GENERAL_CONSULTATION", ["HEALTH_TEST", "GENERAL_CONSULTATION"]),
      true,
    );
  });

  it("is false when nothing in the basket is covered", () => {
    // This is the case the checkout turns into SCOPE_MISMATCH rather than
    // applying a discount of zero.
    assert.equal(
      couponAppliesToAnyLine("SPECIALIST_CONSULTATION", ["HEALTH_TEST", "GENERAL_CONSULTATION"]),
      false,
    );
  });

  it("is false for an empty basket", () => {
    assert.equal(couponAppliesToAnyLine("ANY", []), false);
  });
});

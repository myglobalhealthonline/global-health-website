import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBenefitEligible,
  isRedemptionEligible,
  occupiesActiveSlot,
} from "./subscription-eligibility.js";

const now = new Date("2026-06-21T12:00:00Z");
const future = new Date("2026-07-21T12:00:00Z");
const past = new Date("2026-06-01T12:00:00Z");

describe("isBenefitEligible (§21/§36.7)", () => {
  it("ACTIVE → eligible", () => {
    assert.equal(
      isBenefitEligible({ status: "ACTIVE", cancelAtPeriodEnd: false, currentPeriodEnd: future, now }),
      true,
    );
  });
  it("ACTIVE + cancelAtPeriodEnd in-period → eligible", () => {
    assert.equal(
      isBenefitEligible({ status: "ACTIVE", cancelAtPeriodEnd: true, currentPeriodEnd: future, now }),
      true,
    );
  });
  it("ACTIVE + cancelAtPeriodEnd past period → not eligible", () => {
    assert.equal(
      isBenefitEligible({ status: "ACTIVE", cancelAtPeriodEnd: true, currentPeriodEnd: past, now }),
      false,
    );
  });
  it("PAST_DUE in-period → eligible (benefits persist)", () => {
    assert.equal(
      isBenefitEligible({ status: "PAST_DUE", cancelAtPeriodEnd: false, currentPeriodEnd: future, now }),
      true,
    );
  });
  it("PAST_DUE past period → not eligible", () => {
    assert.equal(
      isBenefitEligible({ status: "PAST_DUE", cancelAtPeriodEnd: false, currentPeriodEnd: past, now }),
      false,
    );
  });
  it("INCOMPLETE / CANCELED → not eligible", () => {
    assert.equal(
      isBenefitEligible({ status: "INCOMPLETE", cancelAtPeriodEnd: false, currentPeriodEnd: future, now }),
      false,
    );
    assert.equal(
      isBenefitEligible({ status: "CANCELED", cancelAtPeriodEnd: false, currentPeriodEnd: future, now }),
      false,
    );
  });
});

describe("isRedemptionEligible (D6=A, stricter)", () => {
  it("ACTIVE → eligible", () => {
    assert.equal(
      isRedemptionEligible({ status: "ACTIVE", cancelAtPeriodEnd: false, currentPeriodEnd: future, now }),
      true,
    );
  });
  it("ACTIVE + cancelAtPeriodEnd in-period → eligible", () => {
    assert.equal(
      isRedemptionEligible({ status: "ACTIVE", cancelAtPeriodEnd: true, currentPeriodEnd: future, now }),
      true,
    );
  });
  it("PAST_DUE → blocked (stricter than benefits)", () => {
    assert.equal(
      isRedemptionEligible({ status: "PAST_DUE", cancelAtPeriodEnd: false, currentPeriodEnd: future, now }),
      false,
    );
  });
});

describe("occupiesActiveSlot (§36.8)", () => {
  it("ACTIVE/INCOMPLETE/PAST_DUE occupy the slot", () => {
    assert.equal(occupiesActiveSlot("ACTIVE"), true);
    assert.equal(occupiesActiveSlot("INCOMPLETE"), true);
    assert.equal(occupiesActiveSlot("PAST_DUE"), true);
  });
  it("CANCELED/PAUSED do not", () => {
    assert.equal(occupiesActiveSlot("CANCELED"), false);
    assert.equal(occupiesActiveSlot("PAUSED"), false);
  });
});

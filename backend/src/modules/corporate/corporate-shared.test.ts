import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
  canTransitionBeneficiary,
  canTransitionEmployee,
  companyIsLive,
  generateCardNumber,
  isEmployeeProfileComplete,
} from "./corporate-shared.js";

describe("corporate status machine", () => {
  it("employee happy path is allowed end-to-end", () => {
    const path = [
      ["DRAFT", "INVITED"],
      ["INVITED", "INVITE_SENT"],
      ["INVITE_SENT", "REGISTERED"],
      ["REGISTERED", "PROFILE_INCOMPLETE"],
      ["PROFILE_INCOMPLETE", "PROFILE_COMPLETE"],
      ["PROFILE_COMPLETE", "PREASSESSMENT_PENDING"],
      ["PREASSESSMENT_PENDING", "PREASSESSMENT_BOOKED"],
      ["PREASSESSMENT_BOOKED", "ACTIVE"],
    ] as const;
    for (const [from, to] of path) {
      assert.equal(canTransitionEmployee(from, to), true, `${from} → ${to}`);
    }
  });

  it("ACTIVE never regresses to onboarding states; REMOVED is terminal", () => {
    assert.equal(canTransitionEmployee("ACTIVE", "PROFILE_INCOMPLETE" as never), false);
    assert.equal(canTransitionEmployee("ACTIVE", "PREASSESSMENT_PENDING" as never), false);
    assert.equal(canTransitionEmployee("REMOVED", "ACTIVE"), false);
    assert.equal(canTransitionEmployee("REMOVED", "INVITED"), false);
  });

  it("cancelled pre-assessment can fall back to pending for rebooking", () => {
    assert.equal(canTransitionEmployee("PREASSESSMENT_BOOKED", "PREASSESSMENT_PENDING"), true);
  });

  it("beneficiary activates without any pre-assessment states", () => {
    assert.equal(canTransitionBeneficiary("REGISTERED", "ACTIVE"), true);
    assert.equal(canTransitionBeneficiary("PROFILE_INCOMPLETE", "ACTIVE"), true);
    assert.equal(canTransitionBeneficiary("REMOVED", "ACTIVE"), false);
  });
});

describe("companyIsLive (discount kill-switch §2.4)", () => {
  it("active + open-ended contract is live", () => {
    assert.equal(companyIsLive({ status: "ACTIVE", contractEndAt: null }), true);
  });
  it("suspended / expired-status companies are dead", () => {
    assert.equal(companyIsLive({ status: "SUSPENDED", contractEndAt: null }), false);
    assert.equal(companyIsLive({ status: "EXPIRED", contractEndAt: null }), false);
  });
  it("past contractEndAt kills benefits even while status is ACTIVE", () => {
    assert.equal(
      companyIsLive({ status: "ACTIVE", contractEndAt: new Date(Date.now() - 1000) }),
      false,
    );
    assert.equal(
      companyIsLive({ status: "ACTIVE", contractEndAt: new Date(Date.now() + 86_400_000) }),
      true,
    );
  });
});

describe("card + profile helpers", () => {
  it("card numbers are GHC- + 10 readable chars, no 0/O/1/I/L", () => {
    for (let i = 0; i < 50; i += 1) {
      const card = generateCardNumber();
      assert.match(card, /^GHC-[ABCDEFGHJKMNPQRSTVWXYZ23456789]{10}$/);
    }
  });

  it("employee profile completeness needs dob + phone + address", () => {
    const base = { dateOfBirth: new Date("1990-01-01"), phone: "+353", addressLine1: "1 Main St" };
    assert.equal(isEmployeeProfileComplete(base), true);
    assert.equal(isEmployeeProfileComplete({ ...base, dateOfBirth: null }), false);
    assert.equal(isEmployeeProfileComplete({ ...base, phone: null }), false);
    assert.equal(isEmployeeProfileComplete({ ...base, addressLine1: null }), false);
  });
});

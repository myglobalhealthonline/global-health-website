import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveFamilyEligibility } from "./family-eligibility.js";

const USER = "user-1";
const owned = { primaryUserId: USER, canUseCredits: true };

describe("resolveFamilyEligibility (§ appointment-claim req #5)", () => {
  it("self-use (no family member) is always eligible", () => {
    assert.deepEqual(
      resolveFamilyEligibility({
        forFamilyMember: false,
        userId: USER,
        member: null,
        snapshotFamilyEnabled: false,
        ruleFamilyUsable: false,
      }),
      { eligible: true },
    );
  });

  it("eligible when owned + Premium family + service usable + member approved", () => {
    assert.deepEqual(
      resolveFamilyEligibility({
        forFamilyMember: true,
        userId: USER,
        member: owned,
        snapshotFamilyEnabled: true,
        ruleFamilyUsable: true,
      }),
      { eligible: true },
    );
  });

  it("NOT_OWNED when member is missing (foreign / removed id)", () => {
    assert.deepEqual(
      resolveFamilyEligibility({
        forFamilyMember: true,
        userId: USER,
        member: null,
        snapshotFamilyEnabled: true,
        ruleFamilyUsable: true,
      }),
      { eligible: false, reason: "NOT_OWNED" },
    );
  });

  it("NOT_OWNED when the member belongs to another user (spoof)", () => {
    assert.deepEqual(
      resolveFamilyEligibility({
        forFamilyMember: true,
        userId: USER,
        member: { primaryUserId: "someone-else", canUseCredits: true },
        snapshotFamilyEnabled: true,
        ruleFamilyUsable: true,
      }),
      { eligible: false, reason: "NOT_OWNED" },
    );
  });

  it("FAMILY_NOT_ENABLED when the plan snapshot has family off (non-Premium)", () => {
    assert.deepEqual(
      resolveFamilyEligibility({
        forFamilyMember: true,
        userId: USER,
        member: owned,
        snapshotFamilyEnabled: false,
        ruleFamilyUsable: true,
      }),
      { eligible: false, reason: "FAMILY_NOT_ENABLED" },
    );
  });

  it("SERVICE_NOT_FAMILY_USABLE when the rule disallows family for this service", () => {
    assert.deepEqual(
      resolveFamilyEligibility({
        forFamilyMember: true,
        userId: USER,
        member: owned,
        snapshotFamilyEnabled: true,
        ruleFamilyUsable: false,
      }),
      { eligible: false, reason: "SERVICE_NOT_FAMILY_USABLE" },
    );
  });

  it("MEMBER_NOT_ALLOWED when the member is not approved (canUseCredits=false)", () => {
    assert.deepEqual(
      resolveFamilyEligibility({
        forFamilyMember: true,
        userId: USER,
        member: { primaryUserId: USER, canUseCredits: false },
        snapshotFamilyEnabled: true,
        ruleFamilyUsable: true,
      }),
      { eligible: false, reason: "MEMBER_NOT_ALLOWED" },
    );
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MembershipNotAvailableError,
  MembershipWithInsuranceError,
  resolveMembershipRequest,
} from "./manual-booking.service.js";

/**
 * §11.7 — the manual-booking benefit decision table.
 *
 * Pure, so every combination is covered without a database, a doctor, a slot or
 * a Stripe client. What it pins is the three interactions the spec left
 * undefined until this phase, each of which fails silently if it regresses:
 * a suppressed benefit, a conflicting pair, and an ambiguous pair.
 */
describe("manual booking — membership request resolution", () => {
  const noFlags = { hasAmountOverride: false, hasInsurance: false };

  it("is a no-op when nothing is asked for — the doctor, follow-up and partner paths", () => {
    assert.deepEqual(
      resolveMembershipRequest({ membership: null, ...noFlags }),
      { mode: "none" },
    );
    assert.deepEqual(
      resolveMembershipRequest({ membership: {}, ...noFlags }),
      { mode: "none" },
    );
    // An explicitly-null pair is the same as absent: these callers pass their
    // own shapes through and must stay byte-identical to before this shipped.
    assert.deepEqual(
      resolveMembershipRequest({
        membership: { enrollmentId: null, override: null },
        ...noFlags,
      }),
      { mode: "none" },
    );
  });

  it("takes the patient's own enrollment, trimmed", () => {
    assert.deepEqual(
      resolveMembershipRequest({ membership: { enrollmentId: "  enr_1  " }, ...noFlags }),
      { mode: "enrollment", enrollmentId: "enr_1" },
    );
  });

  it("treats a whitespace-only enrollment id as absent, not as an id", () => {
    assert.deepEqual(
      resolveMembershipRequest({ membership: { enrollmentId: "   " }, ...noFlags }),
      { mode: "none" },
    );
  });

  it("takes the goodwill override", () => {
    assert.deepEqual(
      resolveMembershipRequest({
        membership: { override: { benefitId: "ben_1", reason: "Goodwill" } },
        ...noFlags,
      }),
      { mode: "override", override: { benefitId: "ben_1", reason: "Goodwill" } },
    );
  });

  it("rejects both at once rather than silently preferring one", () => {
    assert.throws(
      () =>
        resolveMembershipRequest({
          membership: {
            enrollmentId: "enr_1",
            override: { benefitId: "ben_1", reason: "Goodwill" },
          },
          ...noFlags,
        }),
      MembershipNotAvailableError,
    );
  });

  it("suppresses the engine entirely under amountCentsOverride (the follow-up path)", () => {
    // Not an error: the follow-up flow charges a price already agreed on the
    // source consultation, and re-discounting it would silently re-price it.
    assert.deepEqual(
      resolveMembershipRequest({
        membership: { enrollmentId: "enr_1" },
        hasAmountOverride: true,
        hasInsurance: false,
      }),
      { mode: "none" },
    );
    assert.deepEqual(
      resolveMembershipRequest({
        membership: { override: { benefitId: "ben_1", reason: "Goodwill" } },
        hasAmountOverride: true,
        hasInsurance: false,
      }),
      { mode: "none" },
    );
  });

  it("suppression wins over the insurance conflict", () => {
    // A benefit that was never going to be applied must not be able to fail the
    // booking. Order-dependent, so it gets its own case.
    assert.deepEqual(
      resolveMembershipRequest({
        membership: { enrollmentId: "enr_1" },
        hasAmountOverride: true,
        hasInsurance: true,
      }),
      { mode: "none" },
    );
  });

  it("rejects insurance and membership together", () => {
    assert.throws(
      () =>
        resolveMembershipRequest({
          membership: { enrollmentId: "enr_1" },
          hasAmountOverride: false,
          hasInsurance: true,
        }),
      MembershipWithInsuranceError,
    );
    assert.throws(
      () =>
        resolveMembershipRequest({
          membership: { override: { benefitId: "ben_1", reason: "Goodwill" } },
          hasAmountOverride: false,
          hasInsurance: true,
        }),
      MembershipWithInsuranceError,
    );
  });

  it("lets an insurance-only booking through untouched", () => {
    assert.deepEqual(
      resolveMembershipRequest({
        membership: null,
        hasAmountOverride: false,
        hasInsurance: true,
      }),
      { mode: "none" },
    );
  });

  it("rejects the ambiguous pair before considering suppression", () => {
    // "Both set" is a payload the admin never intended, whatever else is true —
    // reporting it as a no-op would hide a broken form.
    assert.throws(
      () =>
        resolveMembershipRequest({
          membership: {
            enrollmentId: "enr_1",
            override: { benefitId: "ben_1", reason: "Goodwill" },
          },
          hasAmountOverride: true,
          hasInsurance: true,
        }),
      MembershipNotAvailableError,
    );
  });
});

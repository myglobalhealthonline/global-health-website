import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asPlanSnapshot, buildPlanSnapshot, type PlanForSnapshot } from "./plan-snapshot.js";

const plan: PlanForSnapshot = {
  monthlyPriceCents: 4900,
  currencyCode: "EUR",
  monthlyConsultationCredits: 3,
  wellnessCreditsPerMonth: 1,
  familyEnabled: false,
  benefitsUnlockAfterPaidMonths: 2,
  consultationRules: [
    {
      serviceId: "gp",
      isIncluded: true,
      usesCredits: true,
      creditsPerUse: 1,
      discountMode: "NONE",
      discountPercent: null,
      fixedPriceCents: null,
      unlockAfterPaidMonths: 0,
      familyUsable: false,
      isActive: true,
    },
    {
      serviceId: "inactive",
      isIncluded: true,
      usesCredits: true,
      creditsPerUse: 1,
      discountMode: "NONE",
      discountPercent: null,
      fixedPriceCents: null,
      unlockAfterPaidMonths: 0,
      familyUsable: false,
      isActive: false,
    },
  ],
  perkRules: [
    { perkKey: "SPECIALIST_DISCOUNT", unlockMode: "AFTER_PAID_MONTHS", unlockAfterPaidMonths: 2 },
  ],
  healthTestRules: [
    { healthTestId: "kit1", requiredWellnessCredits: 6, unlockAfterPaidMonths: 2, isActive: true },
    { healthTestId: "kitX", requiredWellnessCredits: 6, unlockAfterPaidMonths: 2, isActive: false },
  ],
};

describe("buildPlanSnapshot", () => {
  it("captures frozen shape and filters inactive rules", () => {
    const snap = buildPlanSnapshot(plan, 1);
    assert.equal(snap.snapshotVersion, 1);
    assert.equal(snap.monthlyConsultationCredits, 3);
    assert.equal(snap.wellnessCreditsPerMonth, 1);
    assert.equal(snap.benefitsUnlockAfterPaidMonths, 2);
    assert.equal(snap.consultationRules.length, 1, "inactive consultation rule excluded");
    assert.equal(snap.consultationRules[0]?.serviceId, "gp");
    assert.equal(snap.healthTestRules.length, 1, "inactive health-test rule excluded");
    assert.equal(snap.perkRules[0]?.perkKey, "SPECIALIST_DISCOUNT");
  });
});

describe("asPlanSnapshot", () => {
  it("narrows a valid snapshot", () => {
    const snap = buildPlanSnapshot(plan, 1);
    const round = asPlanSnapshot(JSON.parse(JSON.stringify(snap)));
    assert.ok(round);
    assert.equal(round?.monthlyConsultationCredits, 3);
  });
  it("rejects junk", () => {
    assert.equal(asPlanSnapshot(null), null);
    assert.equal(asPlanSnapshot({ foo: 1 }), null);
    assert.equal(asPlanSnapshot("str"), null);
  });
});

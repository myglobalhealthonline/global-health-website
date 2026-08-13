import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

// Pure arithmetic, but the module graph reaches the env config — load .env and
// defer the import, same as the other subscription tests. No DB is touched.
loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Mid-cycle UPGRADE credit top-up. The month's grant already ran under the old
 * plan and is period-keyed, so only the DIFFERENCE may be issued — getting this
 * wrong either double-grants a month of credits or silently gives the upgrader
 * nothing.
 */
describe("upgradeCreditDelta", () => {
  let upgradeCreditDelta: typeof import("./subscription-grant.service.js")["upgradeCreditDelta"];
  before(async () => {
    upgradeCreditDelta = (await import("./subscription-grant.service.js")).upgradeCreditDelta;
  });

  const snap = (
    consultation: number,
    wellness: number,
    unlockMonths: number,
  ) =>
    ({
      monthlyConsultationCredits: consultation,
      wellnessCreditsPerMonth: wellness,
      benefitsUnlockAfterPaidMonths: unlockMonths,
      consultationRules: [],
      perkRules: [],
      healthTestRules: [],
      familyEnabled: false,
    }) as unknown as Parameters<typeof upgradeCreditDelta>[0];

  it("issues only the difference, not a second full month", () => {
    // Basic 1 credit → Premium 3, both unlocked at 2 paid months.
    const d = upgradeCreditDelta(snap(1, 10, 2), snap(3, 25, 2), 2);
    assert.equal(d.consultation, 2, "3 - 1, not 3");
    assert.equal(d.wellness, 15);
  });

  it("keeps perks/credits earned on the old plan — tenure carries over", () => {
    // 2 paid months on Basic already cleared the new plan's 2-month gate, so
    // the upgrade pays out immediately rather than re-locking the subscriber.
    const d = upgradeCreditDelta(snap(1, 0, 2), snap(4, 0, 2), 2);
    assert.equal(d.consultation, 3);
  });

  it("grants nothing when the NEW plan's unlock gate is not met yet", () => {
    // New plan needs 3 paid months; subscriber has 2. Locked on the new side.
    const d = upgradeCreditDelta(snap(1, 0, 2), snap(5, 0, 3), 2);
    assert.equal(d.consultation, 0);
  });

  it("never goes negative — an upgrade must not claw back", () => {
    const d = upgradeCreditDelta(snap(5, 30, 0), snap(2, 10, 0), 6);
    assert.equal(d.consultation, 0);
    assert.equal(d.wellness, 0);
  });

  it("treats a missing previous snapshot as zero entitlement", () => {
    const d = upgradeCreditDelta(null, snap(3, 10, 0), 1);
    assert.equal(d.consultation, 3);
    assert.equal(d.wellness, 10);
  });

  it("grants nothing when both sides are still locked", () => {
    const d = upgradeCreditDelta(snap(1, 0, 5), snap(9, 0, 5), 1);
    assert.equal(d.consultation, 0);
  });

  it("is zero for an identical plan (no-op change)", () => {
    const d = upgradeCreditDelta(snap(2, 12, 1), snap(2, 12, 1), 4);
    assert.equal(d.consultation, 0);
    assert.equal(d.wellness, 0);
  });
});

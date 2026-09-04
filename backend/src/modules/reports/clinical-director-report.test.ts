import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CLINICAL_DIRECTOR_TERMS,
  clinicalDirectorCommission,
} from "./clinical-director-terms.js";

const cz = CLINICAL_DIRECTOR_TERMS.cz;
const ro = CLINICAL_DIRECTOR_TERMS.ro;

describe("clinicalDirectorCommission", () => {
  it("uses the agreed thresholds", () => {
    assert.equal(cz.thresholdCents, 490_000_000); // 4,900,000 CZK
    assert.equal(ro.thresholdCents, 20_000_000); //   200,000 EUR
    for (const t of [cz, ro]) {
      assert.equal(t.topRate, 0.15);
      assert.equal(t.aboveRate, 0.1);
    }
  });

  it("pays the top rate on everything below the threshold", () => {
    // 100,000 CZK invoiced -> 15%
    const fee = clinicalDirectorCommission(10_000_000, cz);
    assert.equal(fee.topFee, 1_500_000);
    assert.equal(fee.aboveFee, 0);
    assert.equal(fee.total, 1_500_000);
  });

  it("splits the bands once the threshold is passed", () => {
    // 6,900,000 CZK = 4,900,000 at 15% + 2,000,000 at 10%
    const fee = clinicalDirectorCommission(690_000_000, cz);
    assert.equal(fee.topFee, 73_500_000); // 735,000 CZK
    assert.equal(fee.aboveFee, 20_000_000); // 200,000 CZK
    assert.equal(fee.total, 93_500_000); // 935,000 CZK
  });

  it("is exact at the threshold itself", () => {
    const fee = clinicalDirectorCommission(cz.thresholdCents, cz);
    assert.equal(fee.aboveFee, 0);
    assert.equal(fee.total, 73_500_000);
  });

  it("applies the Romanian bands in euros", () => {
    // 250,000 EUR = 200,000 at 15% (30,000) + 50,000 at 10% (5,000)
    const fee = clinicalDirectorCommission(25_000_000, ro);
    assert.equal(fee.topFee, 3_000_000);
    assert.equal(fee.aboveFee, 500_000);
    assert.equal(fee.total, 3_500_000);
  });

  it("never pays on nothing, and never goes negative", () => {
    for (const gross of [0, -1]) {
      const fee = clinicalDirectorCommission(gross, cz);
      assert.equal(fee.total, 0);
      assert.equal(fee.topFee, 0);
      assert.equal(fee.aboveFee, 0);
    }
  });

  it("keeps the two band lines summing to the stated total", () => {
    // Rounding is applied per band, so the printed lines must still add up.
    for (const gross of [1, 999, 123_456_789, 490_000_001, 1_000_000_003]) {
      const fee = clinicalDirectorCommission(gross, cz);
      assert.equal(fee.topFee + fee.aboveFee, fee.total, `gross=${gross}`);
    }
  });

  it("only covers markets with an agreed arrangement", () => {
    // Director access alone is not a commission agreement — Ireland and
    // Portugal must not resolve to terms.
    assert.deepEqual(Object.keys(CLINICAL_DIRECTOR_TERMS).sort(), ["cz", "ro"]);
    assert.equal(CLINICAL_DIRECTOR_TERMS.ie, undefined);
    assert.equal(CLINICAL_DIRECTOR_TERMS.pt, undefined);
  });
});

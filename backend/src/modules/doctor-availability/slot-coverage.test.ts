import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SlotCoverage } from "./slot-coverage.js";

const day = (n: number) => new Date(Date.UTC(2026, 0, n));

describe("SlotCoverage", () => {
  it("covers only a recorded containing range and expires it", () => {
    const coverage = new SlotCoverage(100, 4);
    coverage.record("d", day(1), day(5), coverage.version("d"), 0);
    assert.equal(coverage.covers("d", day(2), day(4), 50), true);
    assert.equal(coverage.covers("d", day(1), day(6), 50), false);
    assert.equal(coverage.covers("d", day(2), day(4), 100), false);
  });

  it("does not bridge disjoint successful ranges", () => {
    const coverage = new SlotCoverage(100, 4);
    coverage.record("d", day(1), day(2), coverage.version("d"), 0);
    coverage.record("d", day(3), day(4), coverage.version("d"), 0);
    assert.equal(coverage.covers("d", day(1), day(4), 1), false);
  });

  it("singleflights identical uncovered work and refuses stale records after invalidation", async () => {
    const coverage = new SlotCoverage(100, 4);
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const work = () => coverage.singleFlight("d", day(1), day(2), async () => { calls += 1; await gate; return calls; });
    const first = work(); const second = work();
    assert.equal(first, second);
    const oldVersion = coverage.version("d");
    coverage.invalidate("d");
    coverage.record("d", day(1), day(2), oldVersion, 0);
    release();
    await first;
    assert.equal(calls, 1);
    assert.equal(coverage.covers("d", day(1), day(2), 1), false);
  });

  it("does not extend old evidence expiry when appending a new horizon tail", () => {
    const coverage = new SlotCoverage(100, 4);
    coverage.record("d", day(1), day(2), coverage.version("d"), 0);
    coverage.record("d", day(2), day(3), coverage.version("d"), 90);
    assert.equal(coverage.covers("d", day(1), day(3), 101), false);
  });

  it("evicts doctor metadata without allowing an old flight to resurrect it", () => {
    const coverage = new SlotCoverage(100, 4, 2);
    const old = coverage.version("a");
    coverage.record("a", day(1), day(2), old, 0);
    coverage.version("b"); coverage.version("c");
    assert.equal(coverage.hasRanges("a", 1), false);
    assert.notEqual(coverage.version("a"), old);
    coverage.record("a", day(1), day(2), old, 0);
    assert.equal(coverage.hasRanges("a", 1), false);
  });

  it("generates only uncovered spans and lets failed work retry", async () => {
    const coverage = new SlotCoverage(100, 4);
    coverage.record("d", day(2), day(3), coverage.version("d"), 0);
    assert.deepEqual(coverage.missingRanges("d", day(1), day(4), 1), [{from:day(1),to:day(2)},{from:day(3),to:day(4)}]);
    await assert.rejects(coverage.singleFlight("d",day(1),day(2),async()=>{throw new Error("failed");}));
    assert.equal(await coverage.singleFlight("d",day(1),day(2),async()=>"retried"), "retried");
  });
});

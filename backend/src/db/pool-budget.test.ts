import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDbPoolBudget } from "./pool-budget.js";

describe("resolveDbPoolBudget", () => {
  it("preserves the original ten-connection workload budget by default", () => {
    assert.deepEqual(resolveDbPoolBudget({ clusterWorkers: 1 }), { total: 10, request: 8, scheduler: 2 });
  });

  it("does not create an isolated scheduler pool when only one connection exists", () => {
    assert.deepEqual(resolveDbPoolBudget({ dbPoolMax: 1, clusterWorkers: 1 }), { total: 1, request: 1, scheduler: 0 });
  });

  it("splits the per-worker default budget after cluster sizing", () => {
    assert.deepEqual(resolveDbPoolBudget({ clusterWorkers: 4 }), { total: 2, request: 1, scheduler: 1 });
  });

  it("honours an explicit zero scheduler allocation", () => {
    assert.deepEqual(
      resolveDbPoolBudget({ dbPoolMax: 10, schedulerDbPoolMax: 0, clusterWorkers: 1 }),
      { total: 10, request: 10, scheduler: 0 },
    );
  });

  it("rejects an explicit scheduler allocation that starves requests", () => {
    assert.throws(
      () => resolveDbPoolBudget({ dbPoolMax: 2, schedulerDbPoolMax: 2, clusterWorkers: 1 }),
      /must be smaller/,
    );
  });
});

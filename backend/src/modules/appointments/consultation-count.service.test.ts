import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CUTOVER_AT,
  HISTORICAL_BASE,
  completedSinceCutoverWhere,
} from "./consultation-count.service.js";

describe("completedSinceCutoverWhere", () => {
  it("only counts COMPLETED appointments — every pre-completion and cancelled status excluded", () => {
    const where = completedSinceCutoverWhere();
    assert.equal(where.status, "COMPLETED");
  });

  it("excludes refunded appointments even though they were completed", () => {
    const where = completedSinceCutoverWhere();
    assert.deepEqual(where.paymentStatus, { not: "REFUNDED" });
  });

  it("filters on consultationCompletedAt, not createdAt or scheduledAt", () => {
    const where = completedSinceCutoverWhere();
    assert.ok(where.consultationCompletedAt);
    assert.ok(!("createdAt" in where));
    assert.ok(!("scheduledAt" in where));
  });

  it("defaults to the 2026-07-01T00:00:00.000Z UTC cutover", () => {
    const where = completedSinceCutoverWhere();
    const gte = (where.consultationCompletedAt as { gte: Date }).gte;
    assert.equal(gte.toISOString(), "2026-07-01T00:00:00.000Z");
    assert.equal(CUTOVER_AT.toISOString(), "2026-07-01T00:00:00.000Z");
  });

  it("accepts an explicit cutover override for testing/verification", () => {
    const customCutover = new Date("2026-08-01T00:00:00.000Z");
    const where = completedSinceCutoverWhere(customCutover);
    const gte = (where.consultationCompletedAt as { gte: Date }).gte;
    assert.equal(gte.toISOString(), customCutover.toISOString());
  });
});

describe("HISTORICAL_BASE", () => {
  it("is the fixed previous-platform total through 2026-06-30", () => {
    assert.equal(HISTORICAL_BASE, 45_000);
  });
});

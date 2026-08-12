import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIVE_COUNT_START,
  HISTORICAL_BASE,
  completedSinceLiveStartWhere,
} from "./consultation-count.service.js";

describe("completedSinceLiveStartWhere", () => {
  it("only counts COMPLETED appointments — every pre-completion and cancelled status excluded", () => {
    const where = completedSinceLiveStartWhere();
    assert.equal(where.status, "COMPLETED");
  });

  it("excludes refunded appointments even though they were completed", () => {
    const where = completedSinceLiveStartWhere();
    assert.deepEqual(where.paymentStatus, { not: "REFUNDED" });
  });

  it("filters on consultationCompletedAt, not createdAt or scheduledAt", () => {
    const where = completedSinceLiveStartWhere();
    assert.ok(where.consultationCompletedAt);
    assert.ok(!("createdAt" in where));
    assert.ok(!("scheduledAt" in where));
  });

  it("defaults to the 2026-01-01T00:00:00.000Z UTC boundary (45,000 covers through 2025-12-31)", () => {
    const where = completedSinceLiveStartWhere();
    const gte = (where.consultationCompletedAt as { gte: Date }).gte;
    assert.equal(gte.toISOString(), "2026-01-01T00:00:00.000Z");
    assert.equal(LIVE_COUNT_START.toISOString(), "2026-01-01T00:00:00.000Z");
  });

  it("accepts an explicit boundary override for testing/verification", () => {
    const customStart = new Date("2026-08-01T00:00:00.000Z");
    const where = completedSinceLiveStartWhere(customStart);
    const gte = (where.consultationCompletedAt as { gte: Date }).gte;
    assert.equal(gte.toISOString(), customStart.toISOString());
  });
});

describe("HISTORICAL_BASE", () => {
  it("is the fixed previous-platform total through 2025-12-31", () => {
    assert.equal(HISTORICAL_BASE, 45_000);
  });
});

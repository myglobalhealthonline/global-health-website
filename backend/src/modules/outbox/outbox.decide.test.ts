import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTBOX_MAX_ATTEMPTS,
  outboxBackoffMs,
  outboxNextStatusAfterFailure,
  outboxRowIsDue,
} from "./outbox.js";

test("outboxBackoffMs is 0 before the first attempt and grows exponentially, capped", () => {
  assert.equal(outboxBackoffMs(0), 0);
  assert.equal(outboxBackoffMs(1), 60_000); // 1 min after 1st failure
  assert.equal(outboxBackoffMs(2), 120_000); // 2 min
  assert.equal(outboxBackoffMs(3), 240_000); // 4 min
  // Capped at 30 min however many attempts have been made.
  assert.equal(outboxBackoffMs(20), 30 * 60_000);
});

test("outboxRowIsDue: fresh rows (never attempted) are always due", () => {
  const now = new Date("2026-07-10T12:00:00Z");
  assert.equal(outboxRowIsDue({ attempts: 0, lastAttemptAt: null }, now), true);
});

test("outboxRowIsDue: within backoff window is NOT due, past it IS due", () => {
  const now = new Date("2026-07-10T12:00:00Z");
  // 1 failed attempt -> 60s backoff.
  const justAttempted = new Date(now.getTime() - 30_000); // 30s ago
  assert.equal(outboxRowIsDue({ attempts: 1, lastAttemptAt: justAttempted }, now), false);

  const longAgo = new Date(now.getTime() - 90_000); // 90s ago > 60s
  assert.equal(outboxRowIsDue({ attempts: 1, lastAttemptAt: longAgo }, now), true);

  // Boundary: exactly the backoff window counts as due.
  const exactly = new Date(now.getTime() - 60_000);
  assert.equal(outboxRowIsDue({ attempts: 1, lastAttemptAt: exactly }, now), true);
});

test("outboxNextStatusAfterFailure retries until max attempts, then FAILED", () => {
  assert.equal(outboxNextStatusAfterFailure(1), "PENDING");
  assert.equal(outboxNextStatusAfterFailure(OUTBOX_MAX_ATTEMPTS - 1), "PENDING");
  assert.equal(outboxNextStatusAfterFailure(OUTBOX_MAX_ATTEMPTS), "FAILED");
  assert.equal(outboxNextStatusAfterFailure(OUTBOX_MAX_ATTEMPTS + 3), "FAILED");
});

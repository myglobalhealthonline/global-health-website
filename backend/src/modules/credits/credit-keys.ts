/**
 * Ledger idempotency-key builders (pure). Keys are NOT NULL in the schema
 * (§36.15) and unique-constrained, so a duplicate write is a guaranteed no-op.
 *
 * The monthly grant key is per BILLING PERIOD, not per invoice — Stripe emits
 * multiple invoices per period on retries/proration, so a period key is what
 * makes the grant exactly-once (§36.2).
 */

/** ISO-8601 of the period start — stable across the same period's invoices. */
function periodToken(periodStart: Date): string {
  return periodStart.toISOString();
}

/** Per-period grant key: `sub:{subId}:period:{currentPeriodStart}` (§36.2). */
export function periodGrantKey(
  userSubscriptionId: string,
  periodStart: Date,
): string {
  return `sub:${userSubscriptionId}:period:${periodToken(periodStart)}:grant`;
}

/** Per-period consultation RESET_EXPIRE key (paired with the grant, same tx). */
export function periodResetKey(
  userSubscriptionId: string,
  periodStart: Date,
): string {
  return `sub:${userSubscriptionId}:period:${periodToken(periodStart)}:reset`;
}

/** Per-period wellness MONTHLY_EARN key. */
export function periodWellnessEarnKey(
  userSubscriptionId: string,
  periodStart: Date,
): string {
  return `sub:${userSubscriptionId}:period:${periodToken(periodStart)}:wellness-earn`;
}

/** Reservation RESERVED key (consultation or wellness). */
export function reserveKey(reservationId: string): string {
  return `reservation:${reservationId}:reserve`;
}

/** Reservation terminal key — CONSUMED/REDEEMED commit. */
export function commitKey(reservationId: string): string {
  return `reservation:${reservationId}:commit`;
}

/** Reservation terminal key — RELEASED. */
export function releaseKey(reservationId: string): string {
  return `reservation:${reservationId}:release`;
}

/** Manual admin adjustment key: `admin:{adminId}:{requestId}` (§36.15). */
export function adjustmentKey(adminId: string, requestId: string): string {
  return `admin:${adminId}:${requestId}`;
}

/** Clawback key for a refund/dispute, idempotent per charge + sub + kind. */
export function clawbackKey(
  userSubscriptionId: string,
  stripeEventId: string,
  kind: "CONSULTATION" | "WELLNESS",
): string {
  return `clawback:${userSubscriptionId}:${stripeEventId}:${kind}`;
}

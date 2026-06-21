import type { SubscriptionStatus } from "@prisma/client";

/**
 * Pure eligibility predicates. No I/O — the call site loads the subscription
 * and passes the relevant fields. Resolves §21 ↔ §36.7 ↔ D6.
 */

export interface EligibilityInput {
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  now: Date;
}

/**
 * Benefits (consultation credits + plan discounts) eligibility (§21).
 * Usable through the current paid period even when PAST_DUE (Stripe mid-retry)
 * or cancelAtPeriodEnd — i.e. while `now < currentPeriodEnd`. INCOMPLETE never
 * has benefits; CANCELED / past-period PAST_DUE = none.
 */
export function isBenefitEligible(input: EligibilityInput): boolean {
  const { status, cancelAtPeriodEnd, currentPeriodEnd, now } = input;
  if (status === "ACTIVE") {
    // A cancelAtPeriodEnd ACTIVE sub stays eligible until the period ends.
    if (cancelAtPeriodEnd) {
      return currentPeriodEnd != null && now < currentPeriodEnd;
    }
    return true;
  }
  if (status === "PAST_DUE") {
    return currentPeriodEnd != null && now < currentPeriodEnd;
  }
  return false;
}

/**
 * Wellness-redemption eligibility (D6=A, §36.6) — STRICTER than benefits.
 * Requires ACTIVE (including cancelAtPeriodEnd while still in-period); PAST_DUE
 * and CANCELED are blocked.
 */
export function isRedemptionEligible(input: EligibilityInput): boolean {
  const { status, cancelAtPeriodEnd, currentPeriodEnd, now } = input;
  if (status !== "ACTIVE") return false;
  if (cancelAtPeriodEnd) {
    return currentPeriodEnd != null && now < currentPeriodEnd;
  }
  return true;
}

/** Statuses that occupy the "one active subscription per user" slot (§36.8). */
export const ACTIVE_SLOT_STATUSES: SubscriptionStatus[] = [
  "ACTIVE",
  "INCOMPLETE",
  "PAST_DUE",
];

export function occupiesActiveSlot(status: SubscriptionStatus): boolean {
  return ACTIVE_SLOT_STATUSES.includes(status);
}

import type { PerkUnlockMode } from "@prisma/client";
import type { SnapshotConsultationRule, SnapshotPerkRule } from "./plan-snapshot.js";

/**
 * Pure pricing-priority resolver (§21) + rounding (§38.3) + perk-unlock gate
 * (§9). No I/O: the call site loads the snapshot rule, the peak/base price, the
 * live credit balance, and paidMonthsCount, then applies the result inside a
 * transaction (the actual atomic credit reserve happens at the call site).
 */

export type PriceMode = "CREDIT" | "FIXED" | "PERCENT" | "NORMAL";

export interface ResolvedPrice {
  mode: PriceMode;
  unitPriceCents: number;
  /** Credits to atomically reserve when mode === "CREDIT" (else 0). */
  creditsToReserve: number;
}

export interface ResolvePriceInput {
  /** Snapshot rule for this serviceId, or null when the plan doesn't cover it. */
  rule: SnapshotConsultationRule | null;
  /** Peak/base price for the slot (authoritative pre-plan price, integer cents). */
  basePriceCents: number;
  /** Live consultation-credit balance (from the counter, §36.1). */
  creditsAvailable: number;
  /** Subscriber's paid-month count (gates rule application + perks). */
  paidMonthsCount: number;
}

/**
 * Round-half-up percentage discount AMOUNT, applied once server-side (§38.3).
 * `Math.round` is half-up for positive values, matching the spec exactly so
 * the anti-tamper recompute reproduces the same integer.
 */
export function percentDiscountAmountCents(
  baseCents: number,
  pct: number,
): number {
  return Math.round((baseCents * pct) / 100);
}

/**
 * Resolve the price for a consultation line under a subscription.
 *
 * Priority (§21):
 *   1. included + uses credits + enough credits → CREDIT (€0, reserve N)
 *   2. discountMode FIXED → fixedPriceCents
 *   3. discountMode PERCENT → base − round(base*pct/100)
 *   4. else → NORMAL (base)
 *
 * The whole rule only applies once `paidMonthsCount >= rule.unlockAfterPaidMonths`
 * (perk-gated discounts / inclusion). Below the threshold, NORMAL price applies.
 */
export function resolveConsultationPrice(input: ResolvePriceInput): ResolvedPrice {
  const { rule, basePriceCents, creditsAvailable, paidMonthsCount } = input;
  const normal: ResolvedPrice = {
    mode: "NORMAL",
    unitPriceCents: basePriceCents,
    creditsToReserve: 0,
  };

  if (!rule) return normal;
  if (paidMonthsCount < rule.unlockAfterPaidMonths) return normal;

  // 1. Credit → €0
  if (
    rule.isIncluded &&
    rule.usesCredits &&
    rule.creditsPerUse > 0 &&
    creditsAvailable >= rule.creditsPerUse
  ) {
    return {
      mode: "CREDIT",
      unitPriceCents: 0,
      creditsToReserve: rule.creditsPerUse,
    };
  }

  // 2. Fixed discounted price
  if (rule.discountMode === "FIXED" && rule.fixedPriceCents != null) {
    // Never charge MORE than the base via a misconfigured fixed price.
    return {
      mode: "FIXED",
      unitPriceCents: Math.min(rule.fixedPriceCents, basePriceCents),
      creditsToReserve: 0,
    };
  }

  // 3. Percentage discount
  if (
    rule.discountMode === "PERCENT" &&
    rule.discountPercent != null &&
    rule.discountPercent > 0
  ) {
    const discount = percentDiscountAmountCents(
      basePriceCents,
      rule.discountPercent,
    );
    return {
      mode: "PERCENT",
      unitPriceCents: Math.max(0, basePriceCents - discount),
      creditsToReserve: 0,
    };
  }

  // 4. Normal
  return normal;
}

/**
 * Perk-unlock gate (§9). `grantApproved` is the per-subscriber
 * SubscriptionPerkGrant.status === APPROVED (only consulted for MANUAL_APPROVAL).
 */
export function isPerkUnlocked(
  rule: Pick<SnapshotPerkRule, "unlockMode" | "unlockAfterPaidMonths"> & {
    unlockMode: PerkUnlockMode;
  },
  paidMonthsCount: number,
  grantApproved = false,
): boolean {
  switch (rule.unlockMode) {
    case "MONTH_1":
      return true;
    case "AFTER_PAID_MONTHS":
      return (
        rule.unlockAfterPaidMonths != null &&
        paidMonthsCount >= rule.unlockAfterPaidMonths
      );
    case "MANUAL_APPROVAL":
      return grantApproved;
    case "NOT_AVAILABLE":
      return false;
    default:
      return false;
  }
}

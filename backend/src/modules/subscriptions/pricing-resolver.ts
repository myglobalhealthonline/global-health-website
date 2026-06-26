import type { PerkUnlockMode } from "@prisma/client";
import type { SnapshotConsultationRule, SnapshotPerkRule } from "./plan-snapshot.js";

/**
 * Pure pricing-priority resolver (§21) + rounding (§38.3) + perk-unlock gate
 * (§9). No I/O: the call site loads the snapshot rule, the peak/base price, the
 * live credit balance, and paidMonthsCount, then applies the result inside a
 * transaction (the actual atomic credit reserve happens at the call site).
 */

export type PriceMode = "CREDIT" | "FIXED" | "PERCENT" | "NORMAL";

/**
 * Per-consultation-line benefit choice (§ appointment-claim). PAY_NORMAL never
 * consumes a credit; USE_PLAN_CREDIT applies an included credit only;
 * USE_PLAN_DISCOUNT applies a fixed/percent discount only (never a credit).
 */
export type BenefitSelection = "PAY_NORMAL" | "USE_PLAN_CREDIT" | "USE_PLAN_DISCOUNT";

/**
 * Why a line resolved to the price it did — surfaced in the read-only preview
 * so the UI can explain coverage. NORMAL prices carry a distinct reason
 * (LOCKED / NOT_ENOUGH_CREDITS / FAMILY_UNAVAILABLE / NOT_COVERED) so the
 * cart can warn instead of silently charging full price.
 */
export type CoverageReason =
  | "COVERED"
  | "NOT_COVERED"
  | "LOCKED"
  | "NOT_ENOUGH_CREDITS"
  | "FAMILY_UNAVAILABLE";

export interface ResolvedPrice {
  mode: PriceMode;
  unitPriceCents: number;
  /** Credits to atomically reserve when mode === "CREDIT" (else 0). */
  creditsToReserve: number;
  /** Why this price was chosen (display/anti-tamper diagnostics). */
  reason: CoverageReason;
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
  /**
   * The line's explicit benefit choice. There is NO auto-apply: a line only
   * gets a credit/discount when the user picked it (default PAY_NORMAL).
   */
  benefitSelection: BenefitSelection;
  /**
   * Whether the beneficiary is allowed to use the plan benefit. `true` for
   * self-use; for a family member the service computes the full gate first
   * (ownership + Premium + familyEnabled + familyUsable + canUseCredits).
   */
  familyEligible: boolean;
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
 * Resolve the price for a consultation line under a subscription, honouring the
 * line's EXPLICIT benefit choice (§ appointment-claim). There is no auto-apply:
 *
 *   - !familyEligible           → NORMAL (FAMILY_UNAVAILABLE) — a family line
 *                                 that fails the gate is never benefit-priced.
 *   - PAY_NORMAL                → NORMAL (NOT_COVERED) — never reserves a credit.
 *   - below unlockAfterPaidMonths → NORMAL (LOCKED).
 *   - USE_PLAN_CREDIT           → CREDIT (€0, reserve N) when the rule is an
 *                                 includable credit rule and enough credits;
 *                                 else NORMAL (NOT_ENOUGH_CREDITS / NOT_COVERED).
 *                                 NEVER falls back to a discount the user didn't
 *                                 pick (D7).
 *   - USE_PLAN_DISCOUNT         → FIXED then PERCENT (never a credit); else
 *                                 NORMAL (NOT_COVERED).
 *
 * Pure — the atomic credit reserve happens at the call site only when this
 * returns mode === "CREDIT".
 */
export function resolveConsultationPrice(input: ResolvePriceInput): ResolvedPrice {
  const {
    rule,
    basePriceCents,
    creditsAvailable,
    paidMonthsCount,
    benefitSelection,
    familyEligible,
  } = input;
  const normal = (reason: CoverageReason): ResolvedPrice => ({
    mode: "NORMAL",
    unitPriceCents: basePriceCents,
    creditsToReserve: 0,
    reason,
  });

  if (!rule) return normal("NOT_COVERED");
  // Family gate (or self-use) decided by the caller — a failing family line is
  // never benefit-priced regardless of the selection.
  if (!familyEligible) return normal("FAMILY_UNAVAILABLE");
  // Explicit pay-normal: never reserve, never discount.
  if (benefitSelection === "PAY_NORMAL") return normal("NOT_COVERED");
  // Perk-unlock gate (§9) applies to credit + discount alike.
  if (paidMonthsCount < rule.unlockAfterPaidMonths) return normal("LOCKED");

  if (benefitSelection === "USE_PLAN_CREDIT") {
    const isCreditRule = rule.isIncluded && rule.usesCredits && rule.creditsPerUse > 0;
    if (!isCreditRule) return normal("NOT_COVERED");
    if (creditsAvailable < rule.creditsPerUse) return normal("NOT_ENOUGH_CREDITS");
    return {
      mode: "CREDIT",
      unitPriceCents: 0,
      creditsToReserve: rule.creditsPerUse,
      reason: "COVERED",
    };
  }

  // USE_PLAN_DISCOUNT — fixed then percent, never a credit.
  if (rule.discountMode === "FIXED" && rule.fixedPriceCents != null) {
    // Never charge MORE than the base via a misconfigured fixed price.
    return {
      mode: "FIXED",
      unitPriceCents: Math.min(rule.fixedPriceCents, basePriceCents),
      creditsToReserve: 0,
      reason: "COVERED",
    };
  }
  if (
    rule.discountMode === "PERCENT" &&
    rule.discountPercent != null &&
    rule.discountPercent > 0
  ) {
    const discount = percentDiscountAmountCents(basePriceCents, rule.discountPercent);
    return {
      mode: "PERCENT",
      unitPriceCents: Math.max(0, basePriceCents - discount),
      creditsToReserve: 0,
      reason: "COVERED",
    };
  }

  return normal("NOT_COVERED");
}

/**
 * Which benefit selections a line actually supports — drives the cart's
 * segmented selector so it only offers options the rule can honour. PAY_NORMAL
 * is always available. Credit/discount require the rule to be unlocked and the
 * beneficiary to be family-eligible. USE_PLAN_CREDIT is offered whenever the
 * rule is an includable credit rule (even at zero balance — the line then warns
 * NOT_ENOUGH_CREDITS rather than hiding the option).
 */
export function eligibleBenefitSelections(input: {
  rule: SnapshotConsultationRule | null;
  paidMonthsCount: number;
  familyEligible: boolean;
}): BenefitSelection[] {
  const out: BenefitSelection[] = ["PAY_NORMAL"];
  const { rule, paidMonthsCount, familyEligible } = input;
  if (!rule || !familyEligible) return out;
  if (paidMonthsCount < rule.unlockAfterPaidMonths) return out;

  if (rule.isIncluded && rule.usesCredits && rule.creditsPerUse > 0) {
    out.push("USE_PLAN_CREDIT");
  }
  const hasDiscount =
    (rule.discountMode === "FIXED" && rule.fixedPriceCents != null) ||
    (rule.discountMode === "PERCENT" &&
      rule.discountPercent != null &&
      rule.discountPercent > 0);
  if (hasDiscount) out.push("USE_PLAN_DISCOUNT");
  return out;
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

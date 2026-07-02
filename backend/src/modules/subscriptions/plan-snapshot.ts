import type {
  PerkKey,
  PerkUnlockMode,
  PlanDiscountMode,
} from "@prisma/client";

/**
 * planSnapshot — the resolved plan terms captured on a UserSubscription at
 * subscribe and at EACH renewal (D18/§36.9). The pricing engine (§21) and
 * credit grants (§36.2) read ONLY the snapshot, never the live plan row, so
 * admin edits apply to new periods only. `serviceId`/`healthTestId` resolve
 * against live rows for DISPLAY, never for price.
 *
 * Shape is FROZEN — see contracts.md §"planSnapshot JSON". Sprints 2/3 build
 * against it.
 */

export interface SnapshotConsultationRule {
  serviceId: string;
  isIncluded: boolean;
  usesCredits: boolean;
  creditsPerUse: number;
  discountMode: PlanDiscountMode;
  discountPercent: number | null;
  fixedPriceCents: number | null;
  unlockAfterPaidMonths: number;
  familyUsable: boolean;
}

export interface SnapshotPerkRule {
  perkKey: PerkKey;
  unlockMode: PerkUnlockMode;
  unlockAfterPaidMonths: number | null;
}

export interface SnapshotHealthTestRule {
  healthTestId: string;
  requiredWellnessCredits: number;
  unlockAfterPaidMonths: number;
}

export interface PlanSnapshot {
  snapshotVersion: number;
  monthlyPriceCents: number;
  currencyCode: string;
  monthlyConsultationCredits: number;
  wellnessCreditsPerMonth: number;
  familyEnabled: boolean;
  /**
   * Paid months before plan benefits (GP credits + specialist discounts) become
   * usable/granted (D25 — default 2). Wellness is exempt. Optional in the type
   * because snapshots captured before this field existed won't carry it; read
   * it via `snapshotBenefitsUnlockMonths` which defaults missing → 0
   * (grandfathers existing subscribers until their next renewal snapshot).
   */
  benefitsUnlockAfterPaidMonths?: number;
  consultationRules: SnapshotConsultationRule[];
  perkRules: SnapshotPerkRule[];
  healthTestRules: SnapshotHealthTestRule[];
}

/**
 * Tolerant read of the plan-level benefit-unlock threshold. Legacy snapshots
 * (captured before the field existed) return 0 = immediate, preserving the
 * subscriber's current behavior until their next renewal re-snapshots (D25).
 */
export function snapshotBenefitsUnlockMonths(snapshot: PlanSnapshot): number {
  return typeof snapshot.benefitsUnlockAfterPaidMonths === "number"
    ? snapshot.benefitsUnlockAfterPaidMonths
    : 0;
}

/** The live plan + rule rows needed to build a snapshot (subset of Prisma). */
export interface PlanForSnapshot {
  monthlyPriceCents: number;
  currencyCode: string;
  monthlyConsultationCredits: number;
  wellnessCreditsPerMonth: number;
  familyEnabled: boolean;
  benefitsUnlockAfterPaidMonths: number;
  consultationRules: Array<{
    serviceId: string;
    isIncluded: boolean;
    usesCredits: boolean;
    creditsPerUse: number;
    discountMode: PlanDiscountMode;
    discountPercent: number | null;
    fixedPriceCents: number | null;
    unlockAfterPaidMonths: number;
    familyUsable: boolean;
    isActive: boolean;
  }>;
  perkRules: Array<{
    perkKey: PerkKey;
    unlockMode: PerkUnlockMode;
    unlockAfterPaidMonths: number | null;
  }>;
  healthTestRules: Array<{
    healthTestId: string;
    requiredWellnessCredits: number;
    unlockAfterPaidMonths: number;
    isActive: boolean;
  }>;
}

/**
 * Build the frozen snapshot from a live plan + its rules. Pure — no I/O. Only
 * ACTIVE consultation/health-test rules are captured (deactivated rules stop
 * applying to new periods; existing subscribers keep their old snapshot until
 * their next renewal).
 */
export function buildPlanSnapshot(
  plan: PlanForSnapshot,
  snapshotVersion: number,
): PlanSnapshot {
  return {
    snapshotVersion,
    monthlyPriceCents: plan.monthlyPriceCents,
    currencyCode: plan.currencyCode,
    monthlyConsultationCredits: plan.monthlyConsultationCredits,
    wellnessCreditsPerMonth: plan.wellnessCreditsPerMonth,
    familyEnabled: plan.familyEnabled,
    benefitsUnlockAfterPaidMonths: plan.benefitsUnlockAfterPaidMonths,
    consultationRules: plan.consultationRules
      .filter((r) => r.isActive)
      .map((r) => ({
        serviceId: r.serviceId,
        isIncluded: r.isIncluded,
        usesCredits: r.usesCredits,
        creditsPerUse: r.creditsPerUse,
        discountMode: r.discountMode,
        discountPercent: r.discountPercent,
        fixedPriceCents: r.fixedPriceCents,
        unlockAfterPaidMonths: r.unlockAfterPaidMonths,
        familyUsable: r.familyUsable,
      })),
    perkRules: plan.perkRules.map((r) => ({
      perkKey: r.perkKey,
      unlockMode: r.unlockMode,
      unlockAfterPaidMonths: r.unlockAfterPaidMonths,
    })),
    healthTestRules: plan.healthTestRules
      .filter((r) => r.isActive)
      .map((r) => ({
        healthTestId: r.healthTestId,
        requiredWellnessCredits: r.requiredWellnessCredits,
        unlockAfterPaidMonths: r.unlockAfterPaidMonths,
      })),
  };
}

/** Narrow an unknown JSON value (from Prisma `Json?`) to a PlanSnapshot. */
export function asPlanSnapshot(value: unknown): PlanSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<PlanSnapshot>;
  if (
    typeof v.monthlyConsultationCredits !== "number" ||
    !Array.isArray(v.consultationRules)
  ) {
    return null;
  }
  return value as PlanSnapshot;
}

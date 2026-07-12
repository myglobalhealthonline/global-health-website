import { LocaleCode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { asPlanSnapshot, snapshotBenefitsUnlockMonths } from "./plan-snapshot.js";
import { isBenefitEligible } from "./subscription-eligibility.js";
import { resolveTranslation } from "../shared/resolve-translation.js";

/**
 * Read models for the patient money APIs (Phase 5). Shapes match contracts.md.
 */

export interface SubscriptionView {
  plan: {
    id: string;
    slug: string;
    name: string;
    monthlyPriceCents: number;
    currencyCode: string;
  } | null;
  /** Plan country (lowercase). Lets the patient manage UI resolve sibling
   *  plans for upgrade/downgrade against the right country catalogue. */
  countryCode: string | null;
  status: string;
  currentPeriodEnd: string | null;
  paidMonthsCount: number;
  cancelAtPeriodEnd: boolean;
  /** Paid months before benefits unlock (D25) — from the snapshot. */
  benefitsUnlockAfterPaidMonths: number;
  /** Whether plan benefits (GP credits + discounts) are usable yet. */
  benefitsUnlocked: boolean;
  /** Whether the plan allows family-member credit use AND the sub is
   *  benefit-eligible now (Premium + active/in-period). Drives the booking
   *  family selector + family-page tier banner (B12). */
  familyEligible: boolean;
  pendingChange?: { planName: string; effectiveAt: string | null };
}

/** The patient's current subscription, or null. Includes CANCELED for display. */
export async function getSubscriptionView(
  userId: string,
  requestedLocale?: LocaleCode,
): Promise<SubscriptionView | null> {
  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "PAST_DUE", "INCOMPLETE", "CANCELED", "PAUSED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      plan: {
        select: {
          id: true,
          slug: true,
          name: true,
          monthlyPriceCents: true,
          currencyCode: true,
          translations: true,
          country: { select: { defaultLocale: true } },
        },
      },
    },
  });
  if (!sub) return null;

  const defaultLocale = sub.plan?.country.defaultLocale ?? LocaleCode.EN;
  const requested = requestedLocale ?? defaultLocale;
  const resolvedPlan = sub.plan
    ? {
        id: sub.plan.id,
        slug: sub.plan.slug,
        name: resolveTranslation(sub.plan.translations, requested, defaultLocale).tr?.name ?? sub.plan.name,
        monthlyPriceCents: sub.plan.monthlyPriceCents,
        currencyCode: sub.plan.currencyCode,
      }
    : null;

  let pendingChange: SubscriptionView["pendingChange"];
  if (sub.pendingPlanId) {
    const pendingPlan = await prisma.pricingPlan.findUnique({
      where: { id: sub.pendingPlanId },
      select: { name: true, translations: true },
    });
    pendingChange = {
      planName:
        (pendingPlan && resolveTranslation(pendingPlan.translations, requested, defaultLocale).tr?.name) ??
        pendingPlan?.name ??
        "Updated plan",
      effectiveAt: sub.pendingChangeEffectiveAt?.toISOString() ?? null,
    };
  }

  const snapshot = asPlanSnapshot(sub.planSnapshot);
  const benefitsUnlockAfterPaidMonths = snapshot ? snapshotBenefitsUnlockMonths(snapshot) : 0;
  const benefitEligibleNow = isBenefitEligible({
    status: sub.status,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
    now: new Date(),
  });

  return {
    plan: resolvedPlan,
    countryCode: sub.countryCode ?? null,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    paidMonthsCount: sub.paidMonthsCount,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    benefitsUnlockAfterPaidMonths,
    benefitsUnlocked: sub.paidMonthsCount >= benefitsUnlockAfterPaidMonths,
    familyEligible: Boolean(snapshot?.familyEnabled) && benefitEligibleNow,
    ...(pendingChange ? { pendingChange } : {}),
  };
}

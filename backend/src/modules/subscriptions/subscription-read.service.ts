import { prisma } from "../../db/prisma.js";

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
  status: string;
  currentPeriodEnd: string | null;
  paidMonthsCount: number;
  cancelAtPeriodEnd: boolean;
  pendingChange?: { planName: string; effectiveAt: string | null };
}

/** The patient's current subscription, or null. Includes CANCELED for display. */
export async function getSubscriptionView(userId: string): Promise<SubscriptionView | null> {
  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "PAST_DUE", "INCOMPLETE", "CANCELED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      plan: { select: { id: true, slug: true, name: true, monthlyPriceCents: true, currencyCode: true } },
    },
  });
  if (!sub) return null;

  let pendingChange: SubscriptionView["pendingChange"];
  if (sub.pendingPlanId) {
    const pendingPlan = await prisma.pricingPlan.findUnique({
      where: { id: sub.pendingPlanId },
      select: { name: true },
    });
    pendingChange = {
      planName: pendingPlan?.name ?? "Updated plan",
      effectiveAt: sub.pendingChangeEffectiveAt?.toISOString() ?? null,
    };
  }

  return {
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    paidMonthsCount: sub.paidMonthsCount,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    ...(pendingChange ? { pendingChange } : {}),
  };
}

import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { getBillingPort } from "../billing/billing.factory.js";
import { syncPlanStripePrice } from "../billing/price-sync.service.js";
import { isSubscriptionsEnabled } from "./feature-gate.js";
import { captureSnapshot } from "./plan-snapshot.service.js";
import { notifySubscriptionCanceled } from "./subscription-emails.service.js";
import type { Prisma } from "@prisma/client";

/**
 * Patient-initiated subscription lifecycle (Phase 1): subscribe, cancel,
 * change, billing portal. Talks only to the BillingPort — never the Stripe SDK
 * directly. Login is required (D15); the route passes the authenticated user.
 */

export type SubscriptionError =
  | "NOT_ELIGIBLE"
  | "NO_ACTIVE_SUBSCRIPTION"
  | "ALREADY_SUBSCRIBED"
  | "PLAN_NOT_FOUND"
  | "COUNTRY_MISMATCH";

export class SubscriptionServiceError extends Error {
  constructor(
    public code: SubscriptionError,
    message: string,
  ) {
    super(message);
    this.name = "SubscriptionServiceError";
  }
}

function siteBase(): string {
  return env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
}

export interface StartSubscriptionInput {
  userId: string;
  email: string;
  fullName: string;
  planId: string;
  returnTo?: string;
}

/**
 * Begin a subscription → returns the provider Checkout URL. Enforces the
 * `subscriptions` feature gate (§36.15) and one active sub per user (§36.8).
 * Reuses an abandoned INCOMPLETE row rather than orphaning the active slot.
 */
export async function startSubscription(
  input: StartSubscriptionInput,
): Promise<{ checkoutUrl: string }> {
  const billing = getBillingPort();
  const plan = await prisma.pricingPlan.findUnique({
    where: { id: input.planId },
    include: { country: { select: { code: true, enabledFeatures: true } } },
  });
  if (!plan || !plan.isActive) {
    throw new SubscriptionServiceError("PLAN_NOT_FOUND", "Plan not found");
  }
  if (!isSubscriptionsEnabled(plan.country.enabledFeatures)) {
    throw new SubscriptionServiceError(
      "NOT_ELIGIBLE",
      "Subscriptions are not available in this country",
    );
  }

  // One active subscription per user (§36.8). An ACTIVE/PAST_DUE sub blocks a
  // second; an INCOMPLETE one (abandoned checkout) is reused.
  const existing = await prisma.userSubscription.findFirst({
    where: { userId: input.userId, status: { in: ["ACTIVE", "PAST_DUE", "INCOMPLETE"] } },
  });
  if (existing && existing.status !== "INCOMPLETE") {
    throw new SubscriptionServiceError(
      "ALREADY_SUBSCRIBED",
      "You already have an active subscription",
    );
  }

  // Ensure the plan has a Stripe Price (sync on demand if not yet synced).
  let stripePriceId = plan.stripePriceId;
  if (!stripePriceId) {
    ({ stripePriceId } = await syncPlanStripePrice(plan.id));
  }

  const customer = await billing.findOrCreateCustomer({
    userId: input.userId,
    email: input.email,
    name: input.fullName,
    existingCustomerId: existing?.stripeCustomerId ?? null,
  });

  const snapshot = await captureSnapshot(plan.id, 0);

  const sub =
    existing ??
    (await prisma.userSubscription.create({
      data: {
        userId: input.userId,
        planId: plan.id,
        countryCode: plan.country.code,
        status: "INCOMPLETE",
        stripeCustomerId: customer.customerId,
        stripePriceId,
        planSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        snapshotVersion: 0,
      },
    }));

  if (existing) {
    await prisma.userSubscription.update({
      where: { id: existing.id },
      data: {
        planId: plan.id,
        stripeCustomerId: customer.customerId,
        stripePriceId,
        planSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const returnBase = input.returnTo ?? "/account";
  const checkout = await billing.createSubscriptionCheckout({
    customerId: customer.customerId,
    priceId: stripePriceId,
    successUrl: `${siteBase()}${returnBase}?subscription=ok`,
    cancelUrl: `${siteBase()}${returnBase}?subscription=cancelled`,
    automaticTax: plan.vatMode === "STANDARD",
    metadata: { kind: "subscription", internalSubId: sub.id, userId: input.userId },
  });

  return { checkoutUrl: checkout.url };
}

/** Cancel at period end (Q5=A) — benefits persist to currentPeriodEnd. */
export async function cancelSubscription(
  userId: string,
): Promise<{ status: string; currentPeriodEnd: Date | null }> {
  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) {
    throw new SubscriptionServiceError("NO_ACTIVE_SUBSCRIPTION", "No active subscription");
  }
  if (sub.stripeSubscriptionId) {
    await getBillingPort().cancelAtPeriodEnd(sub.stripeSubscriptionId);
  }
  await prisma.userSubscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
  });
  // Cancellation confirmation email (§30) — fire-and-forget.
  void notifySubscriptionCanceled(sub.id, sub.currentPeriodEnd);
  return { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd };
}

/** Schedule a next-cycle plan change (Q10=B, no proration). */
export async function changePlan(
  userId: string,
  newPlanId: string,
): Promise<{ pendingChangeEffectiveAt: Date | null }> {
  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) {
    throw new SubscriptionServiceError("NO_ACTIVE_SUBSCRIPTION", "No active subscription");
  }
  const newPlan = await prisma.pricingPlan.findUnique({ where: { id: newPlanId } });
  if (!newPlan || !newPlan.isActive) {
    throw new SubscriptionServiceError("PLAN_NOT_FOUND", "Target plan not found");
  }
  // Validate same country (plans are per-country, §18).
  const newPlanCountry = await prisma.country.findUnique({
    where: { id: newPlan.countryId },
    select: { code: true },
  });
  if (newPlanCountry?.code !== sub.countryCode) {
    throw new SubscriptionServiceError(
      "COUNTRY_MISMATCH",
      "Cannot change to a plan in a different country",
    );
  }

  let newPriceId = newPlan.stripePriceId;
  if (!newPriceId) {
    ({ stripePriceId: newPriceId } = await syncPlanStripePrice(newPlan.id));
  }

  let scheduleId: string | null = null;
  if (sub.stripeSubscriptionId) {
    ({ scheduleId } = await getBillingPort().schedulePlanChange({
      subscriptionId: sub.stripeSubscriptionId,
      newPriceId,
    }));
  }

  await prisma.userSubscription.update({
    where: { id: sub.id },
    data: {
      pendingPlanId: newPlan.id,
      pendingStripePriceId: newPriceId,
      pendingChangeEffectiveAt: sub.currentPeriodEnd,
      stripeSubscriptionScheduleId: scheduleId,
    },
  });

  return { pendingChangeEffectiveAt: sub.currentPeriodEnd };
}

/** Billing-portal URL for self-serve cancel / payment-method update. */
export async function getBillingPortalUrl(
  userId: string,
  returnTo?: string,
): Promise<{ portalUrl: string }> {
  const sub = await prisma.userSubscription.findFirst({
    where: { userId, stripeCustomerId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!sub?.stripeCustomerId) {
    throw new SubscriptionServiceError("NO_ACTIVE_SUBSCRIPTION", "No subscription to manage");
  }
  const { url } = await getBillingPort().createBillingPortalSession({
    customerId: sub.stripeCustomerId,
    returnUrl: `${siteBase()}${returnTo ?? "/account"}`,
  });
  return { portalUrl: url };
}

import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { getBillingPort } from "../billing/billing.factory.js";
import { syncPlanStripePrice } from "../billing/price-sync.service.js";
import { isSubscriptionsEnabled } from "./feature-gate.js";
import { captureSnapshot } from "./plan-snapshot.service.js";
import { notifySubscriptionCanceled } from "./subscription-emails.service.js";
import { handleSubscriptionEvent } from "./subscription-webhook.service.js";
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
    // VAT removed from subscription plans — never apply Stripe Tax (no tax line).
    automaticTax: false,
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
  void notifySubscriptionCanceled(sub.id, sub.currentPeriodEnd).catch(() => {});
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

/**
 * DEV / LOCAL ONLY — activate a freshly-created subscription without a real
 * payment. The fake billing driver has no hosted checkout, so a new sub would
 * sit INCOMPLETE forever (no Stripe webhook ever fires) and the patient gets
 * bounced back to the portal with nothing active. This reproduces the EXACT
 * production webhook sequence — checkout.session.completed → subscription
 * active → first invoice paid — by posting canned events through the SAME
 * handler the live Stripe webhook uses, so the subscriber lands on an ACTIVE
 * plan with first-period credits granted.
 *
 * Hard-gated to the fake driver: under `BILLING_DRIVER=stripe` (production)
 * this throws NOT_ELIGIBLE and the route returns 403, so it can never grant a
 * free subscription in production — Stripe remains the sole activator there.
 */
export async function devActivateSubscription(
  userId: string,
): Promise<{ activated: boolean; status: string }> {
  // Double-gated: the fake driver is the dev/test default, and we additionally
  // refuse under NODE_ENV=production so a misconfigured prod (fake driver left
  // on) can never mint a free subscription. Stripe is the sole activator in prod.
  if (getBillingPort().driver !== "fake" || env.NODE_ENV === "production") {
    throw new SubscriptionServiceError(
      "NOT_ELIGIBLE",
      "Dev activation is unavailable",
    );
  }

  const sub = await prisma.userSubscription.findFirst({
    where: { userId, status: { in: ["INCOMPLETE", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) {
    const active = await prisma.userSubscription.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (active) return { activated: false, status: "ACTIVE" };
    throw new SubscriptionServiceError("NO_ACTIVE_SUBSCRIPTION", "No subscription to activate");
  }

  const snapshot = sub.planSnapshot as unknown as {
    monthlyPriceCents?: number;
    currencyCode?: string;
  } | null;
  const amountPaid = snapshot?.monthlyPriceCents ?? 2000;
  const currency = (snapshot?.currencyCode ?? "eur").toLowerCase();
  const stripeSubscriptionId = sub.stripeSubscriptionId ?? `sub_fake_${sub.id}`;
  const stripeCustomerId = sub.stripeCustomerId ?? `cus_fake_${sub.id}`;
  const now = Math.floor(Date.now() / 1000);
  const periodEnd = now + 30 * 24 * 60 * 60;

  // 1) Link the provider ids (status stays INCOMPLETE).
  await handleSubscriptionEvent({
    id: `evt_devactivate_checkout_${sub.id}`,
    type: "checkout.session.completed",
    data: {
      object: {
        mode: "subscription",
        subscription: stripeSubscriptionId,
        customer: stripeCustomerId,
        metadata: { kind: "subscription", internalSubId: sub.id, userId: sub.userId },
      },
    },
  });
  // 2) Subscription goes active + sets the billing period.
  await handleSubscriptionEvent({
    id: `evt_devactivate_subcreated_${sub.id}`,
    type: "customer.subscription.created",
    data: {
      object: {
        id: stripeSubscriptionId,
        status: "active",
        cancel_at_period_end: false,
        current_period_start: now,
        current_period_end: periodEnd,
      },
    },
  });
  // 3) First invoice paid → grant first-period credits + mirror the invoice.
  await handleSubscriptionEvent({
    id: `evt_devactivate_invoice_${sub.id}`,
    type: "invoice.payment_succeeded",
    data: {
      object: {
        id: `in_fake_${sub.id}`,
        subscription: stripeSubscriptionId,
        customer: stripeCustomerId,
        billing_reason: "subscription_create",
        amount_paid: amountPaid,
        currency,
        period_start: now,
        period_end: periodEnd,
        lines: { data: [{ period: { start: now, end: periodEnd } }] },
      },
    },
  });

  const refreshed = await prisma.userSubscription.findUnique({
    where: { id: sub.id },
    select: { status: true },
  });
  return { activated: true, status: refreshed?.status ?? "ACTIVE" };
}

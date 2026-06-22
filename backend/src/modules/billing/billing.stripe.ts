import { getStripeClient } from "../../lib/stripe/client.js";
import type {
  BillingPort,
  BillingPriceRef,
  BillingProductRef,
  BillingSubscriptionView,
  CreatePriceInput,
  CreateSubscriptionCheckoutInput,
  EnsureProductInput,
  FindOrCreateCustomerInput,
  SchedulePlanChangeInput,
} from "./billing.types.js";

/**
 * Real Stripe Subscriptions BillingPort.
 *
 * Implements the straightforward Product/Price/Customer/Checkout/Portal calls
 * directly against the Stripe SDK (already a dependency). The trickier
 * Subscription Schedule path for next-cycle plan changes (Q10=B) is left as a
 * documented TODO — v1 falls back to `subscriptions.update` with
 * `proration_behavior: 'none'`, and full schedule support lands with Sprint 2's
 * admin tooling.
 *
 * This impl is only selected when BILLING_DRIVER=stripe AND STRIPE_SECRET_KEY is
 * set (see billing.factory.ts). Otherwise the in-memory FakeBillingPort is used.
 */
export class StripeBillingPort implements BillingPort {
  readonly driver = "stripe" as const;

  async ensureProduct(input: EnsureProductInput): Promise<BillingProductRef> {
    const stripe = getStripeClient();
    const product = await stripe.products.create({
      name: input.name,
      metadata: { planId: input.planId },
    });
    return { productId: product.id };
  }

  async createPrice(input: CreatePriceInput): Promise<BillingPriceRef> {
    const stripe = getStripeClient();
    const price = await stripe.prices.create({
      product: input.productId,
      unit_amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      recurring: { interval: "month" },
    });
    return {
      priceId: price.id,
      amountCents: price.unit_amount ?? input.amountCents,
      currency: price.currency,
    };
  }

  async archivePrice(priceId: string): Promise<void> {
    const stripe = getStripeClient();
    await stripe.prices.update(priceId, { active: false });
  }

  async findOrCreateCustomer(
    input: FindOrCreateCustomerInput,
  ): Promise<{ customerId: string }> {
    const stripe = getStripeClient();
    if (input.existingCustomerId) {
      return { customerId: input.existingCustomerId };
    }
    const customer = await stripe.customers.create({
      email: input.email,
      name: input.name ?? undefined,
      metadata: { userId: input.userId },
    });
    return { customerId: customer.id };
  }

  async createSubscriptionCheckout(
    input: CreateSubscriptionCheckoutInput,
  ): Promise<{ url: string; sessionId: string }> {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      automatic_tax: { enabled: input.automaticTax },
      // SCA + off-session mandate are collected by Checkout in subscription
      // mode automatically (§38.2). No coupons/trials in v1 (D23).
      metadata: input.metadata,
      subscription_data: { metadata: input.metadata },
    });
    return { url: session.url ?? "", sessionId: session.id };
  }

  async createBillingPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  async cancelAtPeriodEnd(subscriptionId: string): Promise<void> {
    const stripe = getStripeClient();
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async refundLatestPayment(subscriptionId: string): Promise<{ refunded: boolean }> {
    const stripe = getStripeClient();
    const sub = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice.payment_intent"],
    });
    // Resolve the charge defensively across Stripe API versions (invoice.charge
    // was removed in favour of payment_intent.latest_charge on newer versions).
    const inv = (sub as unknown as { latest_invoice?: unknown }).latest_invoice;
    let chargeId: string | null = null;
    if (inv && typeof inv === "object") {
      const i = inv as { charge?: unknown; payment_intent?: unknown };
      if (typeof i.charge === "string") {
        chargeId = i.charge;
      } else if (i.payment_intent && typeof i.payment_intent === "object") {
        const pi = i.payment_intent as { latest_charge?: unknown };
        if (typeof pi.latest_charge === "string") chargeId = pi.latest_charge;
      }
    }
    if (!chargeId) return { refunded: false };
    await stripe.refunds.create({ charge: chargeId });
    return { refunded: true };
  }

  async schedulePlanChange(
    input: SchedulePlanChangeInput,
  ): Promise<{ scheduleId: string | null }> {
    const stripe = getStripeClient();
    // v1: update the subscription's item price with no proration so the new
    // price takes effect at the next cycle. The DB carries the pending-change
    // intent; full Subscription Schedule support is a Sprint 2 follow-up.
    // TODO(sprint-2): migrate to stripe.subscriptionSchedules for richer
    // next-cycle scheduling + UI "changes on <date>".
    const sub = await stripe.subscriptions.retrieve(input.subscriptionId);
    const itemId = sub.items.data[0]?.id;
    if (itemId) {
      await stripe.subscriptions.update(input.subscriptionId, {
        items: [{ id: itemId, price: input.newPriceId }],
        proration_behavior: "none",
      });
    }
    return { scheduleId: null };
  }

  async retrieveSubscription(
    subscriptionId: string,
  ): Promise<BillingSubscriptionView | null> {
    const stripe = getStripeClient();
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      // current_period_* live on the subscription in current API versions; read
      // defensively in case the SDK build surfaces them on the item instead.
      const raw = sub as unknown as {
        current_period_start?: number | null;
        current_period_end?: number | null;
      };
      return {
        id: sub.id,
        status: sub.status,
        customerId:
          typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        priceId: sub.items.data[0]?.price?.id ?? null,
        currentPeriodStart: raw.current_period_start
          ? new Date(raw.current_period_start * 1000)
          : null,
        currentPeriodEnd: raw.current_period_end
          ? new Date(raw.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      };
    } catch {
      return null;
    }
  }
}

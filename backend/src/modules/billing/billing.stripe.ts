import {
  DEFAULT_STRIPE_ACCOUNT,
  getStripeClient,
  resolveStripeAccount,
} from "../../lib/stripe/client.js";
import { emitOpsAlert } from "../subscriptions/ops/ops-alert.js";
import { checkoutBranding } from "./checkout-branding.js";
import type {
  BillingInvoiceView,
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
 * True when a Stripe error is a `resource_missing` (the referenced customer /
 * price / product doesn't exist in the current account — typically a stale id
 * from a previously-configured Stripe account after a key rotation / swap).
 */
export function isResourceMissing(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "resource_missing"
  );
}

/**
 * Every method here uses the DEFAULT (Ireland) Stripe account — customers,
 * prices, subscriptions and the billing portal all have to live on one account,
 * and threading a per-country client through the whole port only pays off once a
 * second market actually sells memberships. One-off payments DO route per
 * country (`getStripeClient(countryCode)`), so a plan in a PT/CZ country would
 * silently mint its customer + subscription on the Irish entity while its
 * one-off orders bill elsewhere. Fail loudly at the entry point instead.
 *
 * ponytail: single-account until a second market sells memberships; the upgrade
 * is `getStripeClient(countryCode)` in every method plus a per-account customer
 * id on UserSubscription.
 */
function assertDefaultStripeAccount(
  countryCode: string | null | undefined,
  operation: string,
): void {
  const account = resolveStripeAccount(countryCode);
  if (account === DEFAULT_STRIPE_ACCOUNT) return;
  void emitOpsAlert({
    severity: "critical",
    title: "Subscription blocked — plan country maps to a non-default Stripe account",
    detail:
      `${operation} for country "${countryCode}" resolves to the "${account}" Stripe account, ` +
      `but the subscription billing port only speaks to "${DEFAULT_STRIPE_ACCOUNT}". ` +
      "Selling memberships in this market needs per-account subscription support first.",
  });
  throw new Error(
    `Subscriptions are not configured for the "${account}" Stripe account (country "${countryCode}").`,
  );
}

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
      // Validate the stored id against the CURRENT account — a customer created
      // on a previously-configured Stripe account no longer exists here (key
      // rotated / account swapped) and would 400 ("No such customer") downstream.
      // On resource_missing (or a deleted customer) fall through and mint a fresh
      // one; the caller persists the returned id back onto the subscription row.
      try {
        const existing = await stripe.customers.retrieve(input.existingCustomerId);
        if (!("deleted" in existing) || !existing.deleted) {
          return { customerId: input.existingCustomerId };
        }
      } catch (err) {
        if (!isResourceMissing(err)) throw err;
      }
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
    assertDefaultStripeAccount(input.countryCode, "subscription checkout");
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      automatic_tax: { enabled: input.automaticTax },
      // Global Health branding: language pinned to the plan's country, plus the
      // recurring-billing trust line above the subscribe button.
      ...(await checkoutBranding(input.countryCode, "subscription")),
      // SCA + off-session mandate are collected by Checkout in subscription
      // mode automatically (§38.2). No coupons/trials in v1 (D23).
      metadata: input.metadata,
      subscription_data: { metadata: input.metadata },
    });
    return { url: session.url ?? "", sessionId: session.id };
  }

  async cancelActiveSubscriptionsForCustomer(
    customerId: string,
  ): Promise<{ canceled: number }> {
    const stripe = getStripeClient();
    let existing;
    try {
      existing = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });
    } catch (err) {
      // Customer doesn't exist on this account (stale cross-account id) — nothing
      // to cancel. A fresh customer is minted upstream, so this is a no-op.
      if (isResourceMissing(err)) return { canceled: 0 };
      throw err;
    }
    const cancelable = existing.data.filter((s) =>
      ["active", "trialing", "past_due", "incomplete", "unpaid"].includes(s.status),
    );
    for (const s of cancelable) {
      // Best-effort — a concurrent cancel / natural expiry is fine to swallow.
      await stripe.subscriptions.cancel(s.id).catch(() => {});
    }
    return { canceled: cancelable.length };
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

  async findLatestSubscriptionIdForCustomer(
    customerId: string,
  ): Promise<string | null> {
    const stripe = getStripeClient();
    try {
      // Stripe returns newest-first; `status: "all"` so a sub that already went
      // past_due (first payment retried) is still recoverable.
      const list = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 1,
      });
      return list.data[0]?.id ?? null;
    } catch (err) {
      if (isResourceMissing(err)) return null;
      throw err;
    }
  }

  async retrieveLatestPaidInvoice(
    subscriptionId: string,
  ): Promise<BillingInvoiceView | null> {
    const stripe = getStripeClient();
    try {
      const list = await stripe.invoices.list({
        subscription: subscriptionId,
        status: "paid",
        limit: 1,
      });
      const inv = list.data[0];
      if (!inv) return null;
      const linePeriod = inv.lines?.data?.[0]?.period;
      const unix = (v: number | null | undefined) =>
        typeof v === "number" && v > 0 ? new Date(v * 1000) : null;
      return {
        id: inv.id ?? subscriptionId,
        billingReason: inv.billing_reason ?? null,
        amountPaidCents: inv.amount_paid ?? 0,
        currency: inv.currency ?? null,
        number: inv.number ?? null,
        taxCents: (inv as unknown as { tax?: number | null }).tax ?? 0,
        hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
        pdfUrl: inv.invoice_pdf ?? null,
        status: inv.status ?? null,
        periodStart: unix(linePeriod?.start) ?? unix(inv.period_start),
        periodEnd: unix(linePeriod?.end) ?? unix(inv.period_end),
      };
    } catch (err) {
      if (isResourceMissing(err)) return null;
      throw err;
    }
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

/**
 * BillingPort — the payment-provider abstraction for subscriptions.
 *
 * The subscription lifecycle (subscribe / portal / cancel / change / price
 * sync) talks ONLY to this interface, never to the Stripe SDK directly. Two
 * implementations exist:
 *   - billing.fake.ts   — in-memory, the DEFAULT in dev/test (no Stripe keys).
 *   - billing.stripe.ts  — real Stripe Subscriptions (thin stub for now).
 *
 * Selection is by env flag (see billing.factory.ts). Webhooks are NOT modelled
 * here: the webhook side-effect logic is a pure service that takes an
 * already-parsed event (subscription-webhook.service.ts), so tests can post
 * canned Stripe fixtures without real keys or signatures.
 */

export type BillingInterval = "MONTHLY";

export interface BillingProductRef {
  productId: string;
}

export interface BillingPriceRef {
  priceId: string;
  amountCents: number;
  currency: string;
}

export interface EnsureProductInput {
  planId: string;
  name: string;
}

export interface CreatePriceInput {
  productId: string;
  amountCents: number;
  /** ISO currency code, lower- or upper-case (provider normalises). */
  currency: string;
  interval: BillingInterval;
}

export interface FindOrCreateCustomerInput {
  userId: string;
  email: string;
  name?: string | null;
  /** Reuse an existing customer id when the user already has one. */
  existingCustomerId?: string | null;
}

export interface CreateSubscriptionCheckoutInput {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  /** Drive Stripe Tax (`automatic_tax`) — false for VAT-EXEMPT plans (D21). */
  automaticTax: boolean;
  metadata: Record<string, string>;
  /** Plan's country — pins the Checkout page language (see checkout-branding.ts). */
  countryCode?: string | null;
  /**
   * MIGRATION ONLY (legacy subscribers imported from another platform, §38.9).
   * First charge is deferred to this instant — Checkout collects and mandates
   * the card today but takes €0, and Stripe raises the first real invoice at
   * `trialEnd`. Set it to the date the member's OLD platform would have billed
   * next, so the import neither double-charges nor gives away a free month.
   * Must be ≥48h in the future (Stripe constraint). Never used by the normal
   * patient subscribe flow — v1 has no trials (D23).
   */
  trialEnd?: Date | null;
}

export interface BillingPortalInput {
  customerId: string;
  returnUrl: string;
}

export interface SchedulePlanChangeInput {
  subscriptionId: string;
  newPriceId: string;
  /**
   * UPGRADES only. Swap the price immediately and invoice the prorated
   * difference now, so the customer gets what they just paid more for today
   * (industry norm). Downgrades leave this false: the price change lands at the
   * next cycle and the customer keeps the tier they already paid for.
   */
  prorateNow?: boolean;
}

export interface BillingSubscriptionView {
  id: string;
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";
  customerId: string;
  priceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

/** Payment-provider abstraction. Both impls are interchangeable. */
export interface BillingPort {
  readonly driver: "fake" | "stripe";

  ensureProduct(input: EnsureProductInput): Promise<BillingProductRef>;
  createPrice(input: CreatePriceInput): Promise<BillingPriceRef>;
  archivePrice(priceId: string): Promise<void>;

  findOrCreateCustomer(
    input: FindOrCreateCustomerInput,
  ): Promise<{ customerId: string }>;

  createSubscriptionCheckout(
    input: CreateSubscriptionCheckoutInput,
  ): Promise<{ url: string; sessionId: string }>;

  /** Cancel every active/incomplete subscription currently on the customer.
   *  Called right before opening a fresh subscription Checkout so a customer can
   *  never accumulate two paid subscriptions (a duplicate or abandoned checkout
   *  otherwise leaves an orphan active subscription at the provider that our DB
   *  never tracks). Returns how many were canceled. No-op on the fake driver. */
  /**
   * Clear ABANDONED provider subscriptions before opening a fresh Checkout.
   * `skippedPaid` counts subscriptions left running because they already have a
   * paid invoice — cancelling those would forfeit the customer's money, so the
   * caller must abort the new Checkout instead of charging a second time.
   */
  cancelActiveSubscriptionsForCustomer(
    customerId: string,
  ): Promise<{ canceled: number; skippedPaid: number }>;

  createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }>;

  /** Flag the subscription to cancel at the end of the current period. */
  cancelAtPeriodEnd(subscriptionId: string): Promise<void>;

  /**
   * Terminate the subscription NOW at the provider — no further invoices.
   * Required whenever we mark a row CANCELED for a reason the provider doesn't
   * know about (refund, dispute, cancel-after-grace): `cancelAtPeriodEnd` is
   * NOT enough, and a local-only CANCEL leaves Stripe billing the customer every
   * month against a membership we no longer honour. Idempotent — an already-
   * canceled or unknown subscription reports `{ canceled:true }`.
   */
  cancelNow(subscriptionId: string): Promise<{ canceled: boolean }>;

  /**
   * Refund the charge behind ONE SPECIFIC invoice. The invoice id is always
   * supplied by the caller (the mirrored `SubscriptionInvoice` for the period
   * being refunded) — "the latest invoice" is NOT the period charge once a
   * mid-cycle upgrade has billed a small `subscription_update` proration on top.
   * `{ refunded:false }` means no charge could be resolved; on the real driver
   * the caller MUST treat that as a failure rather than reconcile regardless.
   */
  refundInvoicePayment(stripeInvoiceId: string): Promise<{ refunded: boolean }>;

  /** Schedule a next-cycle price/plan change (Q10=B, no proration). */
  schedulePlanChange(
    input: SchedulePlanChangeInput,
  ): Promise<{ scheduleId: string | null }>;

  /** Re-fetch the live subscription (reconciliation / out-of-order webhooks). */
  retrieveSubscription(
    subscriptionId: string,
  ): Promise<BillingSubscriptionView | null>;

  /**
   * Newest subscription id on a customer, or null. Recovers the link when
   * `checkout.session.completed` never arrived and our row has no
   * `stripeSubscriptionId` — the only handle we still hold is the customer.
   */
  findLatestSubscriptionIdForCustomer(customerId: string): Promise<string | null>;

  /** Most recent PAID invoice on a subscription (provider-sync fallback). */
  retrieveLatestPaidInvoice(
    subscriptionId: string,
  ): Promise<BillingInvoiceView | null>;
}

/** A paid invoice, normalised for `applyPaidInvoice`. */
export interface BillingInvoiceView {
  id: string;
  billingReason: string | null;
  amountPaidCents: number;
  currency: string | null;
  number: string | null;
  taxCents: number;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
  status: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
}

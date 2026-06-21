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
}

export interface BillingPortalInput {
  customerId: string;
  returnUrl: string;
}

export interface SchedulePlanChangeInput {
  subscriptionId: string;
  newPriceId: string;
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

  createBillingPortalSession(
    input: BillingPortalInput,
  ): Promise<{ url: string }>;

  /** Flag the subscription to cancel at the end of the current period. */
  cancelAtPeriodEnd(subscriptionId: string): Promise<void>;

  /** Schedule a next-cycle price/plan change (Q10=B, no proration). */
  schedulePlanChange(
    input: SchedulePlanChangeInput,
  ): Promise<{ scheduleId: string | null }>;

  /** Re-fetch the live subscription (reconciliation / out-of-order webhooks). */
  retrieveSubscription(
    subscriptionId: string,
  ): Promise<BillingSubscriptionView | null>;
}

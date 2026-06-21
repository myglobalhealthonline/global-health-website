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
 * In-memory BillingPort — the DEFAULT in dev/test. Generates deterministic
 * fake ids and an in-memory subscription store so the lifecycle code runs
 * end-to-end without Stripe keys. Webhooks are exercised by posting canned
 * fixtures to subscription-webhook.service.ts directly, so this store is only
 * consulted by `retrieveSubscription` (reconciliation paths).
 *
 * IDs are seeded from a monotonic counter (no Date.now()/random — keeps test
 * snapshots stable). Tests that need a known subscription id can pre-seed via
 * `seedSubscription`.
 */
export class FakeBillingPort implements BillingPort {
  readonly driver = "fake" as const;

  private seq = 0;
  private readonly products = new Map<string, BillingProductRef>();
  private readonly prices = new Map<string, BillingPriceRef>();
  private readonly customersByUser = new Map<string, string>();
  private readonly subscriptions = new Map<string, BillingSubscriptionView>();

  private nextId(prefix: string): string {
    this.seq += 1;
    return `${prefix}_fake_${this.seq}`;
  }

  async ensureProduct(input: EnsureProductInput): Promise<BillingProductRef> {
    const existing = this.products.get(input.planId);
    if (existing) return existing;
    const ref = { productId: this.nextId("prod") };
    this.products.set(input.planId, ref);
    return ref;
  }

  async createPrice(input: CreatePriceInput): Promise<BillingPriceRef> {
    const ref: BillingPriceRef = {
      priceId: this.nextId("price"),
      amountCents: input.amountCents,
      currency: input.currency.toLowerCase(),
    };
    this.prices.set(ref.priceId, ref);
    return ref;
  }

  async archivePrice(priceId: string): Promise<void> {
    this.prices.delete(priceId);
  }

  async findOrCreateCustomer(
    input: FindOrCreateCustomerInput,
  ): Promise<{ customerId: string }> {
    if (input.existingCustomerId) {
      this.customersByUser.set(input.userId, input.existingCustomerId);
      return { customerId: input.existingCustomerId };
    }
    const existing = this.customersByUser.get(input.userId);
    if (existing) return { customerId: existing };
    const customerId = this.nextId("cus");
    this.customersByUser.set(input.userId, customerId);
    return { customerId };
  }

  async createSubscriptionCheckout(
    input: CreateSubscriptionCheckoutInput,
  ): Promise<{ url: string; sessionId: string }> {
    const sessionId = this.nextId("cs");
    return {
      sessionId,
      url: `https://fake-billing.local/checkout/${sessionId}?return=${encodeURIComponent(
        input.successUrl,
      )}`,
    };
  }

  async createBillingPortalSession(input: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    return {
      url: `https://fake-billing.local/portal/${input.customerId}?return=${encodeURIComponent(
        input.returnUrl,
      )}`,
    };
  }

  async cancelAtPeriodEnd(subscriptionId: string): Promise<void> {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      this.subscriptions.set(subscriptionId, {
        ...sub,
        cancelAtPeriodEnd: true,
      });
    }
  }

  async schedulePlanChange(
    _input: SchedulePlanChangeInput,
  ): Promise<{ scheduleId: string | null }> {
    return { scheduleId: this.nextId("sub_sched") };
  }

  async retrieveSubscription(
    subscriptionId: string,
  ): Promise<BillingSubscriptionView | null> {
    return this.subscriptions.get(subscriptionId) ?? null;
  }

  /** Test helper: register a known subscription for reconciliation paths. */
  seedSubscription(view: BillingSubscriptionView): void {
    this.subscriptions.set(view.id, view);
  }
}

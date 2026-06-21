import { env } from "../../config/env.js";
import { isStripeConfigured } from "../../lib/stripe/client.js";
import { FakeBillingPort } from "./billing.fake.js";
import { StripeBillingPort } from "./billing.stripe.js";
import type { BillingPort } from "./billing.types.js";

/**
 * Resolve the active BillingPort.
 *
 * Default is the in-memory fake (dev/test, no Stripe keys). The real Stripe
 * port is selected ONLY when BILLING_DRIVER=stripe AND STRIPE_SECRET_KEY is
 * configured — otherwise we fall back to the fake so a missing key can never
 * half-wire real billing.
 *
 * The fake is a singleton per process so in-memory state (customers, seeded
 * subscriptions) persists across calls within a run/test.
 */
let fakeSingleton: FakeBillingPort | null = null;
let stripeSingleton: StripeBillingPort | null = null;

export function getBillingPort(): BillingPort {
  if (env.BILLING_DRIVER === "stripe" && isStripeConfigured()) {
    stripeSingleton ??= new StripeBillingPort();
    return stripeSingleton;
  }
  fakeSingleton ??= new FakeBillingPort();
  return fakeSingleton;
}

/** Test-only: get the underlying fake (for seeding) — null if stripe is live. */
export function getFakeBillingPortForTests(): FakeBillingPort {
  fakeSingleton ??= new FakeBillingPort();
  return fakeSingleton;
}

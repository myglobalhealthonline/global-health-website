import Stripe from "stripe";
import { env } from "../../config/env.js";

// stripe-node's default export is both a constructor (value) AND a namespace
// (type), which can confuse TS module-resolution. Alias the instance type
// via `InstanceType` so it's unambiguous.
type StripeInstance = InstanceType<typeof Stripe>;

/**
 * Stripe adapter. Feature-gated on STRIPE_SECRET_KEY:
 *   - No key → `isStripeConfigured()` returns false, every payments route
 *     returns 503 "Payments not configured". The rest of the site still
 *     works (bookings go straight to admin inbox without payment).
 *   - Key set → real Stripe client; checkout sessions + webhook all wired.
 *
 * To go live:
 *   1. Create a Stripe account (sign up at stripe.com)
 *   2. Toggle TEST MODE on (top-right of the dashboard) while developing
 *   3. Get your API keys from https://dashboard.stripe.com/test/apikeys
 *      - Set STRIPE_SECRET_KEY=sk_test_…  in backend/.env
 *      - Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_… in frontend/.env.local
 *   4. Set STRIPE_WEBHOOK_SECRET=whsec_… in backend/.env
 *      - Easiest: run `stripe listen --forward-to localhost:4000/api/payments/webhook`
 *        which prints the whsec_… to use locally.
 *   5. Restart both dev servers.
 *
 * For production: rotate to live keys (pk_live_…, sk_live_…) and register the
 * webhook endpoint at https://dashboard.stripe.com/webhooks.
 */

let cached: StripeInstance | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}

export function getStripeClient(): StripeInstance {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured: STRIPE_SECRET_KEY missing");
  }
  if (!cached) {
    // Use SDK default apiVersion — typed against the SDK build to avoid
    // string-literal drift. Pin in env later if you need older-version
    // backward compat for an existing integration.
    cached = new Stripe(env.STRIPE_SECRET_KEY, {
      typescript: true,
      appInfo: {
        name: "global-health-website",
        version: "1.0.0",
      },
    });
  }
  return cached;
}

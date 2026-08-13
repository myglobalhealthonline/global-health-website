import Stripe from "stripe";
import { env } from "../../config/env.js";

// stripe-node's default export is both a constructor (value) AND a namespace
// (type), which can confuse TS module-resolution. Alias the instance type
// via `InstanceType` so it's unambiguous.
type StripeInstance = InstanceType<typeof Stripe>;

/**
 * Multi-account Stripe adapter.
 *
 * One-off consultation/order payments route to a per-country Stripe account:
 *   - Portugal (pt)      → PT sandbox
 *   - Czech    (cz)      → CZ sandbox
 *   - everything else (incl. Spain es/sp) → Ireland (the default account)
 *
 * Ireland is the DEFAULT account and reuses the original
 * STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET env vars, so every call-site that
 * doesn't pass a country (subscriptions, Brazil-consent, redemption shipping)
 * transparently keeps hitting Ireland.
 *
 * Each account (PT/ES/CZ) has its own STRIPE_SECRET_KEY_<CC> /
 * STRIPE_WEBHOOK_SECRET_<CC>. When a sandbox key is unset the account degrades
 * to Ireland's key rather than failing — a half-configured sandbox can never
 * take a market offline (503).
 *
 * Feature-gated on the resolved account's secret key: no key → the payments
 * routes return 503 "Payments not configured" and the rest of the site still
 * works (bookings go straight to the admin inbox without payment).
 *
 * To go live for a market: replace that account's sk_test_…/whsec_… with live
 * values and register the webhook endpoint at
 * https://dashboard.stripe.com/webhooks (URL is the same for all accounts).
 */

export type StripeAccountId = "ie" | "pt" | "cz";

/** The account `getStripeClient()` uses when no country is passed. */
export const DEFAULT_STRIPE_ACCOUNT: StripeAccountId = "ie";

interface StripeAccountConfig {
  secretKey?: string;
  webhookSecret?: string;
}

/**
 * Account config table. `ie` is the default and reads the original env vars;
 * PT/ES/CZ read their own pair and fall back to Ireland's key when unset.
 */
function accountConfig(id: StripeAccountId): StripeAccountConfig {
  switch (id) {
    case "pt":
      return {
        secretKey: env.STRIPE_SECRET_KEY_PT ?? env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET_PT,
      };
    case "cz":
      return {
        secretKey: env.STRIPE_SECRET_KEY_CZ ?? env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET_CZ,
      };
    case "ie":
    default:
      return {
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      };
  }
}

/**
 * Map a country code to the Stripe account that should handle its one-off
 * payments. Unknown / undefined → Ireland (the default account).
 */
export function resolveStripeAccount(countryCode?: string | null): StripeAccountId {
  switch (countryCode?.trim().toLowerCase()) {
    case "pt":
      return "pt";
    case "cz":
      return "cz";
    default:
      // Everything else — Ireland, Romania, Spain (es/sp), Brazil, unknown.
      //
      // Brazil stays on Ireland deliberately. It bills on commission (see
      // modules/orders/commission.service.ts) but doctor payouts are settled
      // OUTSIDE Stripe by bank transfer, against the admin commission-payout
      // report — Stripe permits no transfer from an EEA platform to a Brazilian
      // connected account, and we hold no Brazilian Stripe entity.
      return "ie";
  }
}

export function isStripeConfigured(countryCode?: string | null): boolean {
  return Boolean(accountConfig(resolveStripeAccount(countryCode)).secretKey);
}

/**
 * True when the account handling this country is on a LIVE Stripe key
 * (`sk_live_…`), i.e. real money — as opposed to a sandbox `sk_test_…` key.
 *
 * There is no `event.livemode` plumbed through the one-off payment path, so the
 * secret-key prefix is the authoritative test-vs-live signal. Used to gate the
 * Portugal InvoiceExpress issuer so a sandbox payment never issues a real legal
 * invoice — it flips on automatically the moment a live PT key is configured.
 */
export function isStripeLiveMode(countryCode?: string | null): boolean {
  const cfg = accountConfig(resolveStripeAccount(countryCode));
  return Boolean(cfg.secretKey?.startsWith("sk_live_"));
}

export function isStripeWebhookConfigured(countryCode?: string | null): boolean {
  const cfg = accountConfig(resolveStripeAccount(countryCode));
  return Boolean(cfg.secretKey && cfg.webhookSecret);
}

/**
 * All distinct configured webhook signing secrets across every account. The
 * webhook receiver tries each until one verifies the incoming signature — the
 * matching secret identifies which account sent the event.
 */
export function getConfiguredWebhookSecrets(): string[] {
  const ids: StripeAccountId[] = ["ie", "pt", "cz"];
  const secrets = new Set<string>();
  for (const id of ids) {
    const secret = accountConfig(id).webhookSecret;
    if (secret) secrets.add(secret);
  }
  return [...secrets];
}

// Stripe's default export resolves to the constructor interface, not the type
// namespace (same quirk noted in checkout-branding.ts), so this is declared
// structurally rather than pulled off `Stripe.Checkout.SessionCreateParams`.
type CheckoutPaymentMethodType = "card" | "mb_way" | "multibanco" | "customer_balance";

export type CheckoutPaymentMethodConfig = {
  customer_email?: string;
  customer?: string;
  payment_method_types: CheckoutPaymentMethodType[];
  phone_number_collection?: { enabled: boolean };
};

/**
 * Portugal gets card + MB WAY + Multibanco; every other market keeps plain card.
 *
 * NO `customer_balance` (EU bank transfer) for PT. Stripe accepts
 * `eu_bank_transfer` for DE, FR, IE and NL only — passing `country: "PT"` makes
 * checkout.sessions.create throw outright, which took every PT payment path
 * down (manual booking, web checkout, and the pay-link resolver) and shipped
 * patients a payment message with an empty link. The PT account also lacks the
 * `bank_transfer_payments` capability, so the method could not have worked
 * regardless. Multibanco already covers the bank-reference habit PT patients
 * expect. Do not re-add bank transfer without a Stripe-supported country AND
 * the capability enabled on the PT account.
 */
export async function resolveCheckoutPaymentMethods(
  _stripe: StripeInstance,
  countryCode: string | null | undefined,
  email: string,
): Promise<CheckoutPaymentMethodConfig> {
  if (countryCode?.trim().toLowerCase() !== "pt") {
    return { customer_email: email, payment_method_types: ["card"] };
  }
  return {
    customer_email: email,
    payment_method_types: ["card", "mb_way", "multibanco"],
    phone_number_collection: { enabled: true },
  };
}

const clients = new Map<StripeAccountId, StripeInstance>();

/**
 * Resolve the Stripe client for a country's account. No country / unknown
 * country → Ireland (default). Throws if the resolved account has no key.
 */
export function getStripeClient(countryCode?: string | null): StripeInstance {
  const accountId = resolveStripeAccount(countryCode);
  const cfg = accountConfig(accountId);
  if (!cfg.secretKey) {
    throw new Error(
      `Stripe is not configured for account "${accountId}": secret key missing`,
    );
  }
  let client = clients.get(accountId);
  if (!client) {
    // Use SDK default apiVersion — typed against the SDK build to avoid
    // string-literal drift. Pin in env later if you need older-version
    // backward compat for an existing integration.
    client = new Stripe(cfg.secretKey, {
      typescript: true,
      appInfo: {
        name: "global-health-website",
        version: "1.0.0",
      },
    });
    clients.set(accountId, client);
  }
  return client;
}

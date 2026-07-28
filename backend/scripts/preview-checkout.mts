/**
 * Create a throwaway Stripe Checkout Session to eyeball the branding.
 *
 * Deliberately does NOT go through the app's checkout route. This machine's
 * .env points at the LIVE production database, so POST /api/cart/checkout
 * would mint a real Order row, flip it to PENDING, and kick off the
 * pre-payment notification flow with localhost links. This script touches
 * Stripe only -- no database, no email, no WhatsApp.
 *
 * It calls the real checkoutBranding() from the shipped module, so what you
 * see on the page is exactly what production sends.
 *
 * Usage (from the backend/ directory):
 *   npx tsx <this file> [countryCode] [--live]
 *
 * Refuses to run against a live key unless --live is passed explicitly.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const BACKEND = path.resolve(process.cwd());
const country = (process.argv[2] ?? "pt").toLowerCase();
const allowLive = process.argv.includes("--live");

// Minimal .env reader -- avoids pulling in the app's config module, which
// validates a lot of unrelated vars we don't need here.
function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = readEnv(path.join(BACKEND, ".env"));

// Same account routing as lib/stripe/client.ts: pt -> PT, cz -> CZ, else IE.
const accountKey =
  country === "pt"
    ? env.STRIPE_SECRET_KEY_PT || env.STRIPE_SECRET_KEY
    : country === "cz"
      ? env.STRIPE_SECRET_KEY_CZ || env.STRIPE_SECRET_KEY
      : env.STRIPE_SECRET_KEY;

if (!accountKey) {
  console.error("No Stripe secret key found in backend/.env for this country.");
  process.exit(1);
}

const mode = accountKey.startsWith("sk_live_") ? "LIVE" : "TEST";
if (mode === "LIVE" && !allowLive) {
  console.error(
    `\nRefusing to run: the account for "${country}" is on a LIVE key.\n` +
      `A live session is harmless (nothing is charged until someone pays, and\n` +
      `it expires in 24h), but it does appear in your live Stripe dashboard.\n` +
      `Re-run with --live if that's fine, or try a country on a test key.\n`,
  );
  process.exit(2);
}

const { default: Stripe } = await import("stripe");
const brandingUrl = pathToFileURL(
  path.join(BACKEND, "src/modules/billing/checkout-branding.ts"),
).href;
const { checkoutBranding } = (await import(brandingUrl)) as {
  checkoutBranding: (
    cc?: string | null,
    variant?: "payment" | "subscription",
  ) => Promise<{ locale: string; custom_text: { submit: { message: string } } }>;
};

const branding = await checkoutBranding(country);

console.log(`\naccount    ${country} -> ${mode} key`);
console.log(`locale     ${branding.locale}`);
console.log(`trust line ${branding.custom_text.submit.message.slice(0, 90)}…\n`);

const stripe = new Stripe(accountKey);
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  customer_email: "preview@myglobalhealth.online",
  line_items: [
    {
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: 5500,
        product_data: { name: "GP Consultation Online" },
      },
    },
  ],
  success_url: "https://www.myglobalhealth.online/checkout/success",
  cancel_url: "https://www.myglobalhealth.online/checkout/cancelled",
  ...branding,
  metadata: { kind: "branding_preview", note: "not a real order" },
});

console.log(`${mode} checkout URL:\n${session.url}\n`);
console.log(`session ${session.id} — expires in 24h, no order was created.`);

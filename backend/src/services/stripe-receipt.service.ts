import { getStripeClient, isStripeConfigured } from "../lib/stripe/client.js";

/**
 * Fetches the Stripe receipt URL for a given PaymentIntent.
 * Returns null when Stripe is not configured or no charges exist.
 * Errors are swallowed — callers should render "Invoice not available", never throw.
 */
export async function getReceiptUrl(stripePaymentIntentId: string | null): Promise<string | null> {
  if (!stripePaymentIntentId || !isStripeConfigured()) return null;

  try {
    const stripe = getStripeClient();
    const intent = await stripe.paymentIntents.retrieve(stripePaymentIntentId, {
      expand: ["latest_charge"],
    });

    const charge = intent.latest_charge;
    if (!charge || typeof charge === "string") return null;
    return charge.receipt_url ?? null;
  } catch {
    return null;
  }
}

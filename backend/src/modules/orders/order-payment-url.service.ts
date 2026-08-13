import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import {
  getStripeClient,
  isStripeConfigured,
  resolveCheckoutPaymentMethods,
} from "../../lib/stripe/client.js";
import { buildPtStripeInvoiceData } from "../invoices/pt-stripe-invoice-data.js";
import { checkoutBranding } from "../billing/checkout-branding.js";
import { isCommissionCountry } from "./commission.service.js";

function isSessionOpen(session: {
  status: string | null;
  url: string | null;
  expires_at: number | null;
}): boolean {
  return (
    session.status === "open" &&
    Boolean(session.url?.trim()) &&
    (!session.expires_at || session.expires_at * 1000 > Date.now())
  );
}

/**
 * Short, branded pay link that 302-redirects to the live Stripe Checkout URL
 * (frontend `app/pay/[orderId]` → backend `/api/orders/:id/pay-url`). Handed to
 * WhatsApp/email instead of the 200-char Stripe URL, and always resolves the
 * freshest session (and the cancelled/paid guard) at click time.
 */
export function orderPayShortLink(orderId: string): string {
  const base = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
  return `${base}/pay/${orderId}`;
}

/**
 * Returns a working Stripe Checkout URL for an unpaid order.
 * Reuses an open session when possible; creates a fresh session when the
 * original has expired (Stripe sessions expire after ~24h).
 */
export async function resolveOrderPaymentUrl(
  orderId: string,
  overrideUrl?: string | null,
): Promise<string> {
  if (overrideUrl?.trim()) return overrideUrl.trim();
  if (!isStripeConfigured()) return "";

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.items.length === 0) return "";

  // A cancelled / refunded / already-paid order is not payable — never hand back
  // (or mint) a checkout link for it. Guards the admin "copy link", the patient
  // pay page, and the pre-payment reminders in one place.
  if (
    order.status === "CANCELLED" ||
    order.status === "REFUNDED" ||
    order.paymentStatus === "PAID" ||
    order.paymentStatus === "REFUNDED"
  ) {
    return "";
  }

  const stripe = getStripeClient(order.countryCode);

  if (order.stripeSessionId) {
    try {
      const existing = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      if (isSessionOpen(existing) && existing.url) {
        return existing.url;
      }
    } catch {
      // Stale session id — create a new one below.
    }
  }

  try {
    const currency = order.currencyCode.toLowerCase();
    const lineItems = order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency,
        unit_amount: item.unitPriceCents,
        product_data: { name: item.name },
      },
    }));

    if (order.shippingCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency,
          unit_amount: order.shippingCents,
          product_data: { name: "Shipping" },
        },
      });
    }

    const baseUrl = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
    const successUrl = `${baseUrl}/checkout/success?orderId=${order.id}&payment=ok&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/checkout/cancelled?orderId=${order.id}&payment=cancelled`;

    // Portugal: attach NIF + service to the auto-created Stripe invoice for
    // InvoiceExpress. Non-PT orders keep Stripe's default (no invoice created
    // on this resend path).
    //
    // Commission markets never get a Stripe invoice: it would document the full
    // amount charged and contradict our commission-only receipt. Today no
    // commission market is also PT, so buildPtStripeInvoiceData already returns
    // undefined for them — but the commission flag is an admin toggle on any
    // country, so make the exclusion explicit rather than incidental.
    const invoiceCreation = (await isCommissionCountry(order.countryCode))
      ? undefined
      : await buildPtStripeInvoiceData(
          order.countryCode,
          order.email,
          order.items[0]?.name ?? "Medical Consultation",
        );

    const paymentMethodConfig = await resolveCheckoutPaymentMethods(
      stripe,
      order.countryCode,
      order.email,
    );
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ...paymentMethodConfig,
      client_reference_id: order.id,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(invoiceCreation ? { invoice_creation: invoiceCreation } : {}),
      // Global Health branding — same language + trust line as the first-pass
      // checkout, so a resent pay link doesn't look like a different vendor.
      ...(await checkoutBranding(order.countryCode)),
      metadata: {
        kind: "order",
        orderId: order.id,
        countryCode: order.countryCode,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id, paymentStatus: "PENDING" },
    });

    return session.url?.trim() ?? "";
  } catch (err) {
    // NEVER swallow this silently: an empty return here is what ships a patient
    // a payment message with a blank link (see the PT eu_bank_transfer outage).
    // The caller still degrades to "", but the reason must be in the logs.
    console.error(
      `[order-payment-url] Stripe checkout session creation FAILED for order ${orderId} (${order.countryCode}):`,
      err instanceof Error ? err.message : err,
    );
    return "";
  }
}

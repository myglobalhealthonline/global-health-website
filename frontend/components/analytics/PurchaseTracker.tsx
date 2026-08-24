"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/track";

/**
 * Fires GA4's `purchase` from the checkout success page.
 *
 * The success page is a Server Component and `force-dynamic`, so the event
 * needs a client boundary. It is mounted only on the CONFIRMED-paid branch —
 * the "processing" branch reloads itself once the webhook lands and would
 * otherwise fire a purchase for an order Stripe has not confirmed.
 *
 * Deduped in `sessionStorage` by order id, not by a ref: the page reloads
 * itself while polling for the webhook, and patients refresh receipts. A ref
 * resets on every one of those and would inflate revenue. `transaction_id`
 * makes GA4 dedupe server-side too, but only within a 48h window and only
 * after the hit has already been counted in realtime — the guard is cheaper.
 *
 * `trackAnalyticsEvent` still applies the consent, production and gtag gates,
 * so nothing here fires for a visitor who declined analytics.
 */
export function PurchaseTracker({
  orderId,
  totalCents,
  currencyCode,
}: {
  orderId: string;
  totalCents: number;
  currencyCode: string;
}) {
  useEffect(() => {
    const key = `gh_purchase_sent:${orderId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Private mode / storage disabled. Firing an occasional duplicate is
      // better than never recording revenue at all.
    }
    trackAnalyticsEvent("purchase", {
      transaction_id: orderId,
      // GA4 wants a major-unit number, not cents.
      value: Math.round(totalCents) / 100,
      currency: currencyCode,
    });
  }, [orderId, totalCents, currencyCode]);

  return null;
}

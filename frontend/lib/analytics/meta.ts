import { readConsent } from "@/components/compliance/cookie-consent";

/**
 * Ambient `window.fbq`. No existing declaration — mirrors `window.gtag` in
 * `./types.ts`. `fbq('track', ...)` takes an event name, a flat params
 * object, and an optional `{eventID}` — the third arg is how a browser
 * Purchase dedupes against the server-side Conversions API event carrying
 * the same `event_id`.
 */
declare global {
  interface Window {
    fbq?: (
      command: "track" | "consent",
      eventName: MetaEventName | "PageView" | "grant" | "revoke",
      params?: Record<string, string | number>,
      options?: { eventID: string },
    ) => void;
  }
}

/**
 * Closed union, same reasoning as `AnalyticsEventName` in `./track.ts`: this
 * is a healthcare site, and an ad-hoc event name is how something that
 * shouldn't leave the site (a symptom, a treatment) ends up at Meta.
 */
export type MetaEventName = "Purchase" | "InitiateCheckout";

export interface MetaEventParams extends Record<string, string | number> {
  value: number;
  currency: string;
}

/**
 * A small buffer in front of `window.fbq`, identical in shape to
 * `gtagCall`/`flushGtagQueue` in `./gtag.ts` and for the same reason: the
 * pixel's `<Script>` is `strategy="lazyOnload"`, so `window.fbq` may not
 * exist yet when the checkout-success effect runs. Never DEFINES
 * `window.fbq` — the inline snippet in `MetaPixel.tsx` remains the single
 * definition; `MetaPixel` flushes this queue once it has run.
 */
const MAX_PENDING = 32;

let pending: [MetaEventName, MetaEventParams, string][] = [];

/**
 * The only sanctioned way to send a Meta Pixel event. Gated on marketing
 * consent here (not just at the `MetaPixel` mount point) so a call site
 * never has to remember the gate itself — same pattern as
 * `trackAnalyticsEvent`'s consent check in `./track.ts`.
 *
 * `eventID` must match the `event_id` the backend sends to the Conversions
 * API for the same order, so Meta dedupes the browser and server events
 * into one conversion instead of counting it twice.
 */
export function trackMetaEvent(eventName: MetaEventName, params: MetaEventParams, eventID: string): void {
  if (typeof window === "undefined") return;
  if (readConsent()?.marketing !== true) return;
  const safe = { value: params.value, currency: params.currency };

  const fn = window.fbq;
  if (fn) {
    fn("track", eventName, safe, { eventID });
    return;
  }
  if (pending.length < MAX_PENDING) pending.push([eventName, safe, eventID]);
}

export function flushMetaQueue(): void {
  if (typeof window === "undefined") return;
  const fn = window.fbq;
  if (!fn) return;
  const queued = pending;
  pending = [];
  if (readConsent()?.marketing !== true) return;
  for (const [eventName, params, eventID] of queued) fn("track", eventName, params, { eventID });
}

/** Drop anything buffered — used when consent is withdrawn before fbq loads. */
export function resetMetaQueue(): void {
  pending = [];
}

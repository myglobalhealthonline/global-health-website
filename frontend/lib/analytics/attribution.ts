import { readCookie } from "@/lib/utils/cookies";
import { readConsent } from "@/components/compliance/cookie-consent";
import type { CheckoutAttribution } from "@/lib/api/cart-client";

/**
 * Reads what `AttributionCapture` wrote on landing (`gh-attribution`) plus
 * the pixel's own `_fbp`/`_fbc` cookies, and bundles it with the current
 * marketing-consent flag for the checkout request body. The backend uses
 * this to attribute the order to an ad and to gate the server-side
 * Conversions API send — CAPI must never fire for a visitor who declined
 * marketing consent.
 */
export function readCheckoutAttribution(): CheckoutAttribution {
  const marketingConsent = readConsent()?.marketing === true;
  const attribution: CheckoutAttribution = { marketingConsent };

  const raw = readCookie("gh-attribution");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed.fbclid) attribution.fbclid = parsed.fbclid;
      if (parsed.utm_source) attribution.utmSource = parsed.utm_source;
      if (parsed.utm_medium) attribution.utmMedium = parsed.utm_medium;
      if (parsed.utm_campaign) attribution.utmCampaign = parsed.utm_campaign;
      if (parsed.utm_term) attribution.utmTerm = parsed.utm_term;
      if (parsed.utm_content) attribution.utmContent = parsed.utm_content;
      if (parsed.landingPath) attribution.landingPath = parsed.landingPath;
    } catch {
      // Malformed cookie (hand-edited, truncated) — proceed without it.
    }
  }

  const fbp = readCookie("_fbp");
  if (fbp) attribution.fbp = fbp;
  const fbc = readCookie("_fbc");
  if (fbc) attribution.fbc = fbc;

  return attribution;
}

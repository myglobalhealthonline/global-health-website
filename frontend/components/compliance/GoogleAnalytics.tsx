"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useConsent } from "./use-consent";
import { ANALYTICS_ENABLED, GA_MEASUREMENT_ID } from "@/lib/analytics/config";
import { flushGtagQueue, gtagCall, resetGtagQueue } from "@/lib/analytics/gtag";
import { sanitizePagePath } from "@/lib/analytics/analytics-routes";
import { purgeGaCookies } from "@/lib/analytics/cookies";

/**
 * GA4. Same gate as MetaPixel (S-027): never fires before the visitor opts in
 * to the "Analytics" category, and never mounts on authenticated portal routes
 * — it is rendered only from the two public root layouts. `useConsent()`
 * re-reads on the same-tab change event, so accept/withdraw take effect
 * without a reload.
 *
 * Three things are load-bearing here and are easy to break:
 *
 *  1. `send_page_view: false` + a manual `page_view`. The automatic one sends
 *     the RAW browser URL, query string included — on this site that can mean
 *     a Stripe session id or a certificate code. Every path GA sees now goes
 *     through `sanitizePagePath` first.
 *
 *  2. `gtag('set', …)` BEFORE the event, and globally. GA4 Enhanced
 *     Measurement (scroll, click, form_start, user_engagement) stamps
 *     page_location from the browser URL on its own. Sanitizing only the
 *     page_view would leave every one of those carrying the query string.
 *
 *  3. The inline bootstrap runs at `afterInteractive` and the loader stays
 *     `lazyOnload`. The inline script is what defines `dataLayer`/`gtag`, so
 *     calls made before gtag.js lands are buffered in `dataLayer` and replayed
 *     — the lazy load costs nothing, and this is a marketing site where LCP is
 *     the metric.
 *
 * Consent Mode v2 defaults ALL FOUR signals to denied. Any signal not
 * explicitly defaulted is treated as granted, which previously left
 * ad_storage / ad_user_data / ad_personalization silently on.
 */
export function GoogleAnalytics() {
  const { consent } = useConsent();
  const pathname = usePathname();

  const granted = ANALYTICS_ENABLED && GA_MEASUREMENT_ID !== "" && consent?.analytics === true;

  // Dedup key for page_view. A ref on this fiber, so React StrictMode's dev
  // mount → unmount → mount cycle short-circuits the second run instead of
  // double-counting.
  const lastSentPath = useRef<string | null>(null);
  const wasGranted = useRef(false);

  // No early `return null` above these hooks: the teardown below has to run in
  // the render where consent flips to false, and rules-of-hooks forbids a
  // conditional return sitting above a useEffect.

  useEffect(() => {
    if (!granted) return;
    const path = sanitizePagePath(pathname);
    // `granted` is a boolean, so this effect does not re-run just because
    // useConsent() handed back a fresh ConsentRecord object.
    if (lastSentPath.current === path) return;
    lastSentPath.current = path;

    const location = `${window.location.origin}${path}`;
    const params = { page_path: path, page_location: location, page_title: document.title };

    gtagCall("set", params);
    gtagCall("event", "page_view", params);
  }, [granted, pathname]);

  useEffect(() => {
    if (granted) {
      wasGranted.current = true;
      // Lift the hard kill if consent is granted again in the same document.
      window[`ga-disable-${GA_MEASUREMENT_ID}` as const] = false;
      return;
    }
    if (!wasGranted.current) return; // never granted → nothing to tear down
    wasGranted.current = false;
    lastSentPath.current = null; // a re-grant should re-fire page_view
    resetGtagQueue();

    // gtag.js is already resident and Enhanced Measurement keeps firing.
    // `consent update … denied` alone only downgrades it to COOKIELESS PINGS,
    // which still put hits on the wire. `ga-disable-<ID>` is Google's
    // documented hard opt-out: gtag.js then sends nothing at all for this id.
    window[`ga-disable-${GA_MEASUREMENT_ID}` as const] = true;
    window.gtag?.("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
    purgeGaCookies(GA_MEASUREMENT_ID);
  }, [granted]);

  if (!granted) return null;

  return (
    <>
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      {/* anonymize_ip is deliberately absent: it is a Universal Analytics
          parameter and a no-op in GA4, which always drops the IP. The levers
          that actually matter here are the two allow_* flags below. */}
      <Script id="ga4-init" strategy="afterInteractive" onReady={flushGtagQueue}>
        {`window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'});
gtag('consent','update',{analytics_storage:'granted'});
gtag('config',${JSON.stringify(GA_MEASUREMENT_ID)},{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});`}
      </Script>
      <Script
        id="ga4-loader"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
      />
    </>
  );
}

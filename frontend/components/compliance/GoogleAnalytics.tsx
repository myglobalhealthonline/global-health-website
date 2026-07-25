"use client";

import Script from "next/script";
import { useConsent } from "./use-consent";

const GA_MEASUREMENT_ID = "G-SP48D9LJJ5";

/**
 * Same gate as MetaPixel (S-027): never fires before the visitor opts in to
 * the "Analytics" category, and never mounts on authenticated portal routes
 * (only rendered from the public (site) layout). `useConsent()` re-reads on
 * the same-tab change event, so Accept/withdraw take effect without reload.
 *
 * Consent Mode v2: `consent('default', …)` ships denied before gtag.js loads
 * so any GA-adjacent Google tag on the page also starts denied; the config
 * call right after grants it for this load since we only render once
 * consent.analytics is already true.
 */
export function GoogleAnalytics() {
  const { consent } = useConsent();

  if (consent?.analytics !== true) return null;

  return (
    <>
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      <Script
        id="ga4-loader"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script id="ga4-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('consent', 'default', { analytics_storage: 'denied' });
gtag('consent', 'update', { analytics_storage: 'granted' });
gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });`}
      </Script>
    </>
  );
}

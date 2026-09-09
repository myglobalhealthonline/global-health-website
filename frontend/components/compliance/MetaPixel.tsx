"use client";

import Script from "next/script";
import { useEffect } from "react";
import { flushMetaQueue, resetMetaQueue } from "@/lib/analytics/meta";
import { useConsent } from "./use-consent";
import { readConsent } from "./cookie-consent";

const META_PIXEL_ID = "5455895281301269";

/**
 * S-027: the pixel must never fire before the visitor has opted in to the
 * "Advertising" category, and must never mount on authenticated portal routes
 * at all (this component is only rendered from the public (site) layout).
 * `useConsent()` re-reads on the same-tab change event, so a first-time visitor
 * who clicks Accept is tracked immediately without needing a reload — and one
 * who later withdraws consent stops being tracked on the next navigation.
 */
export function MetaPixel() {
  const { consent } = useConsent();
  useEffect(() => {
    window.fbq?.("consent", consent?.marketing === true ? "grant" : "revoke");
    if (consent?.marketing !== true) resetMetaQueue();
  }, [consent?.marketing]);

  if (consent?.marketing !== true) return null;

  function onReady() {
    // The lazy script can finish after consent was withdrawn.
    if (readConsent()?.marketing !== true) {
      window.fbq?.("consent", "revoke");
      resetMetaQueue();
      return;
    }
    window.fbq?.("consent", "grant");
    window.fbq?.("track", "PageView");
    flushMetaQueue();
  }

  return (
    <>
      <link rel="preconnect" href="https://connect.facebook.net" />
      <link rel="dns-prefetch" href="https://connect.facebook.net" />
      <Script
        id="meta-pixel"
        strategy="lazyOnload"
        onReady={onReady}
      >
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('consent', 'revoke');
fbq('set', 'autoConfig', false, '${META_PIXEL_ID}');
fbq('init', '${META_PIXEL_ID}');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel noscript fallback; next/image can't render inside noscript */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

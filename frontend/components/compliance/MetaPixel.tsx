"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { COOKIE_CONSENT_STORAGE_KEY, COOKIE_CONSENT_EVENT } from "./cookie-consent";

const META_PIXEL_ID = "5455895281301269";

/**
 * S-027: the pixel must never fire before the visitor has acknowledged the
 * cookie notice, and must never mount on authenticated portal routes at all
 * (this component is only rendered from the public (site) layout). Consent
 * is read from the same localStorage key CookieBanner writes; a same-tab
 * custom event lets first-time visitors get tracked immediately after they
 * click through the banner, without needing a reload.
 */
export function MetaPixel() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        if (window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)) {
          setConsented(true);
        }
      } catch {
        // localStorage blocked — fail closed, no tracking
      }
    });
    function onConsent() {
      setConsented(true);
    }
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => {
      cancelled = true;
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
    };
  }, []);

  if (!consented) return null;

  return (
    <>
      <link rel="preconnect" href="https://connect.facebook.net" />
      <link rel="dns-prefetch" href="https://connect.facebook.net" />
      <Script id="meta-pixel" strategy="lazyOnload">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
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

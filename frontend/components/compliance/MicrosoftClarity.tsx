"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useConsent } from "./use-consent";
import { ANALYTICS_ENABLED, CLARITY_PROJECT_ID } from "@/lib/analytics/config";
import { isClarityAllowed } from "@/lib/analytics/analytics-routes";
import { purgeClarityCookies } from "@/lib/analytics/cookies";

/**
 * Microsoft Clarity — session replay and heatmaps, on published marketing
 * pages only.
 *
 * Three independent gates, all of which must pass: production (or the debug
 * escape hatch), the "Analytics" consent category, and the route allowlist in
 * `lib/analytics/analytics-routes.ts`. Like GA4 this is mounted only from the
 * two public root layouts, so portal routes are additionally out of reach by
 * construction (S-027).
 *
 * THE NON-OBVIOUS PART: mounting is a ONE-WAY LATCH. Once
 * clarity.ms/tag/<id> has executed, the recorder lives on `window` and keeps
 * sampling — un-rendering this `<Script>` removes markup, not behaviour, and
 * `next/script` de-dupes by `id` so re-rendering it later is a no-op. Recording
 * is therefore controlled at RUNTIME via clarity("stop") / clarity("start"),
 * not by mounting and unmounting.
 *
 * A visitor whose entry page is denied (an email link straight to /checkout)
 * never loads the tag at all — `armed` stays false until both gates pass once.
 *
 * MASKING IS NOT SET FROM CODE. The Mask All / Balanced / Relaxed level is a
 * Clarity dashboard setting with no JS API, so the project must be set to
 * "Mask All" in the dashboard — this file cannot enforce it. What is available
 * from code is `data-clarity-mask="true"` on individual elements; see
 * HeaderAuthActions and NewsletterSignup.
 */
export function MicrosoftClarity() {
  const { consent } = useConsent();
  const pathname = usePathname();

  const granted = ANALYTICS_ENABLED && CLARITY_PROJECT_ID !== "" && consent?.analytics === true;
  const allowed = isClarityAllowed(pathname);

  const [armed, setArmed] = useState(false);
  /**
   * Set once the INLINE bootstrap has run — which is all we need to wait for.
   * That snippet installs `window.clarity` as a queueing stub
   * (`c[a].q.push(arguments)`), so every call we make is buffered and replayed
   * when the remote tag finishes initialising. We never have to wait on
   * clarity.ms itself.
   */
  const bootstrapped = useRef(false);
  /**
   * The gate as of the latest commit, readable from the async `onReady`
   * callback. Without it there is a live race: arm on an allowed page, the
   * bootstrap has not run yet, the visitor navigates to /cart or withdraws
   * consent — the effect below bails out because `bootstrapped` is still false
   * and never re-runs, so `onReady` would then grant consent and start
   * recording on exactly the page that is supposed to be off limits.
   */
  const desired = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-way latch: consent is browser-only state, and the tag must not render until it has been read post-mount
    if (granted && allowed) setArmed(true);
  }, [granted, allowed]);

  // onReady, NOT onLoad: next/script wires onLoad to the element's `load`
  // event, and an inline <script> never fires one. onReady is the hook that
  // runs for inline scripts.
  const onReady = useCallback(() => {
    bootstrapped.current = true;
    const clarity = window.clarity;
    if (!clarity) return;
    // ad_Storage stays denied permanently, in BOTH branches. Clarity sits in
    // our "analytics" category, and ad_Storage is what authorises the MUID /
    // Bing advertising-identity sync — we never ask the visitor for that, so
    // we never grant it. Note Microsoft's casing: capital S, unlike gtag's
    // all-lowercase analytics_storage. Wrong casing fails silently.
    if (!desired.current) {
      clarity("stop");
      clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
      return;
    }
    clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
  }, []);

  // Stop on navigation into a denied route, resume on the way back out.
  useEffect(() => {
    // Assigned before the early return, so it is current even when the
    // bootstrap has not run yet.
    desired.current = granted && allowed;
    if (!bootstrapped.current || !window.clarity) return;
    if (granted && allowed) window.clarity("start");
    else window.clarity("stop");
  }, [granted, allowed, pathname]);

  // Withdrawal. There is no Clarity equivalent of GA's ga-disable-* flag;
  // "stop" is the entire API surface for this.
  useEffect(() => {
    if (granted || !bootstrapped.current || !window.clarity) return;
    window.clarity("stop");
    window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" });
    purgeClarityCookies();
  }, [granted]);

  if (!armed) return null;

  // afterInteractive, not lazyOnload: a recorder that starts after the
  // interactions it was meant to record is useless. It only ever loads for
  // consenting visitors on marketing pages, so the cost is bounded.
  return (
    <Script id="ms-clarity" strategy="afterInteractive" onReady={onReady}>
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(CLARITY_PROJECT_ID)});`}
    </Script>
  );
}

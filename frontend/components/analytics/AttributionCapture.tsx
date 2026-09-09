"use client";

import { useEffect } from "react";
import { writeCookie } from "@/lib/utils/cookies";

/**
 * Captures ad click/campaign params on landing so a later booking can be
 * attributed to the ad that drove it — independent of what Meta/Google
 * self-report. Same tracking-param set as
 * `lib/seo/booking-workflow-metadata.ts` (kept in sync manually; that file
 * governs indexability, this one governs attribution, but a click id should
 * mean the same thing in both places).
 *
 * Deliberately reads `window.location.search` directly instead of
 * `useSearchParams()`: that hook forces the nearest Suspense boundary and
 * opts a route out of static rendering, which would deopt every marketing
 * page just to capture params only ads traffic ever sets.
 *
 * Last-touch: only overwrites the cookie when the URL actually carries a
 * tracking param, so an organic visit after an ad click doesn't erase the
 * ad attribution.
 */
const TRACKING_PARAM_KEYS = [
  "fbclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
] as const;

const COOKIE_NAME = "gh-attribution";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function AttributionCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const captured: Record<string, string> = {};
    for (const key of TRACKING_PARAM_KEYS) {
      const value = params.get(key);
      if (value) captured[key] = value;
    }
    if (Object.keys(captured).length === 0) return;

    captured.landingPath = window.location.pathname;
    captured.ts = String(Date.now());
    writeCookie(COOKIE_NAME, JSON.stringify(captured), MAX_AGE_SECONDS);
  }, []);

  return null;
}

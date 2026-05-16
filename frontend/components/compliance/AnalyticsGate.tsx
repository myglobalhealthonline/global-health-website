"use client";

import { useEffect, useState } from "react";

/**
 * Loads the Plausible analytics script only when:
 *   1. `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set
 *   2. The visitor has accepted cookies (or "essential-only" decline still
 *      allows cookieless analytics — set the env var to opt out entirely)
 *
 * Plausible is cookieless by design but we still wait for consent before
 * loading the network request, which is the conservative GDPR posture.
 */
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "";

function getStoredConsent(): "accepted" | "declined" | null {
  try {
    const value = window.localStorage.getItem("gh-cookie-consent");
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

export function AnalyticsGate() {
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    setConsent(getStoredConsent());

    function onConsentChange(event: Event) {
      const detail = (event as CustomEvent<"accepted" | "declined">).detail;
      if (detail === "accepted" || detail === "declined") {
        setConsent(detail);
      }
    }
    window.addEventListener("gh:cookie-consent", onConsentChange);
    return () => window.removeEventListener("gh:cookie-consent", onConsentChange);
  }, []);

  if (!PLAUSIBLE_DOMAIN || consent !== "accepted") return null;

  return (
    <script
      defer
      data-domain={PLAUSIBLE_DOMAIN}
      src="https://plausible.io/js/script.js"
    />
  );
}

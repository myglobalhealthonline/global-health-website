"use client";

import { useEffect, useState } from "react";
import {
  CONSENT_CHANGE_EVENT,
  readConsent,
  purgeLegacyConsent,
  type ConsentRecord,
} from "./cookie-consent";

/**
 * `ready` is what keeps this hydration-safe: the server has no cookies in the
 * client bundle's hands, so the first client paint must match SSR — i.e. render
 * as if nothing is consented. Consumers show `null` or a fixed-height
 * placeholder until `ready` flips, which also means zero layout shift.
 */
export function useConsent(): { consent: ConsentRecord | null; ready: boolean } {
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    purgeLegacyConsent();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only consent storage, must run post-mount for SSR-safety
    setConsent(readConsent());
    setReady(true);

    function onChange() {
      setConsent(readConsent());
    }
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  }, []);

  return { consent, ready };
}

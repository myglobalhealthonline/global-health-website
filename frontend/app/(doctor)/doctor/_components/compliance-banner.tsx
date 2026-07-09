"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const DISMISS_KEY = "gh-doctor-compliance-banner-dismissed";

/**
 * Non-blocking compliance nudge for doctors: shown while the medical-access
 * guard runs relaxed, so confidentiality + 2FA are complete before strict
 * mode is flipped on. Dismiss is per browser session (sessionStorage) — it
 * reappears next session until both items are resolved server-side.
 */
export type ComplianceBannerCopy = {
  title: string;
  description: string;
  acceptConfidentiality: string;
  enable2fa: string;
  dismissAria: string;
};

export function ComplianceBanner({
  confidentialityAccepted,
  twoFactorEnabled,
  copy,
}: {
  confidentialityAccepted: boolean;
  twoFactorEnabled: boolean;
  copy: ComplianceBannerCopy;
}) {
  // Start hidden to avoid a hydration mismatch — sessionStorage is
  // client-only, so decide visibility after mount.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // sessionStorage is client-only; reading it post-mount (and setting
    // state once) is the intended hydration-safe pattern here.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(sessionStorage.getItem(DISMISS_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // sessionStorage unavailable — banner just hides for this render.
    }
    setVisible(false);
  }

  return (
    <div
      role="status"
      className="gh-admin-card mx-4 mt-4 flex items-start justify-between gap-3 px-4 py-3 text-sm lg:mx-6"
      style={{
        borderLeft: "3px solid var(--portal-warning)",
        color: "var(--portal-warning-text)",
      }}
    >
      <div className="min-w-0">
        <p className="font-semibold">{copy.title}</p>
        <p className="mt-0.5" style={{ color: "var(--portal-text)" }}>
          {copy.description}
        </p>
        <ul className="mt-1.5 list-disc pl-5">
          {!confidentialityAccepted ? (
            <li>
              <Link
                href="/doctor/confidentiality"
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--portal-warning-text)" }}
              >
                {copy.acceptConfidentiality}
              </Link>
            </li>
          ) : null}
          {!twoFactorEnabled ? (
            <li>
              <Link
                href="/doctor/security"
                className="font-semibold underline underline-offset-2"
                style={{ color: "var(--portal-warning-text)" }}
              >
                {copy.enable2fa}
              </Link>
            </li>
          ) : null}
        </ul>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={copy.dismissAria}
        className="shrink-0 rounded-md p-1 hover:bg-black/5"
        style={{ color: "var(--portal-warning-text)" }}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

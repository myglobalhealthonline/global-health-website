"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Minimal GDPR-friendly cookie banner.
 *
 * The site uses one strictly-necessary cookie (`gh_auth` session) plus
 * country + language preference cookies. No third-party trackers — we
 * still surface the banner so the consent flow is on record. One button
 * acknowledges, no decline path needed because there's nothing optional
 * to opt out of.
 *
 * Persists `cookie-consent=acknowledged` in localStorage so the banner
 * stays dismissed on subsequent visits.
 */
const STORAGE_KEY = "gh-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const existing = window.localStorage.getItem(STORAGE_KEY);
      if (!existing) setVisible(true);
    } catch {
      // localStorage blocked (private mode w/ aggressive settings) — fail closed.
    }
  }, []);

  function acknowledge() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      // Same-as-above; user will re-see banner next visit, that's fine.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:p-5"
      style={{ boxShadow: "0 10px 30px rgba(15, 46, 37, 0.18)" }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          We use a session cookie to keep you signed in plus country and
          language preferences. No third-party trackers. See our{" "}
          <Link href="/privacy" className="font-semibold text-emerald-700 underline">
            privacy notice
          </Link>{" "}
          for details.
        </p>
        <div className="shrink-0">
          <button
            type="button"
            onClick={acknowledge}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

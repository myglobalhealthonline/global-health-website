"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Minimal GDPR-friendly cookie banner.
 *
 * The site uses one strictly-necessary cookie (`gh_auth` session) plus an
 * optional analytics layer (Plausible — cookieless) and the language /
 * country prefs cookies. Because nothing is third-party-tracked, we offer
 * an "Accept" + "Decline" pair instead of a full consent matrix.
 *
 * Decline persists `cookie-consent=declined` so analytics scripts in the
 * root layout can opt-out themselves. Accept persists `cookie-consent=accepted`.
 * Banner is dismissed in either case via localStorage.
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

  function persist(value: "accepted" | "declined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Same-as-above; user will re-see banner next visit, that's fine.
    }
    // Surface to anything listening (e.g. analytics-gate component).
    window.dispatchEvent(new CustomEvent("gh:cookie-consent", { detail: value }));
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
          We use a session cookie to keep you signed in and (with consent) a
          cookieless analytics script to understand which pages help patients.
          See our{" "}
          <Link href="/privacy" className="font-semibold text-emerald-700 underline">
            privacy notice
          </Link>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => persist("declined")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => persist("accepted")}
            className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

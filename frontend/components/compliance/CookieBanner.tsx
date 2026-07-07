"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { resolveLocale } from "@/lib/i18n/resolve-locale";

const STORAGE_KEY = "gh-cookie-consent";

function readClientLocale(): LocaleCode {
  try {
    const match = document.cookie.match(/(?:^|;\s*)gh_locale=([^;]+)/);
    const raw = match ? decodeURIComponent(match[1]) : "";
    return resolveLocale({ cookieLocale: raw });
  } catch {
    return "en";
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [locale, setLocale] = useState<LocaleCode>("en");

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const existing = window.localStorage.getItem(STORAGE_KEY);
        if (!existing) {
          setLocale(readClientLocale());
          setVisible(true);
        }
      } catch {
        // localStorage blocked — fail closed
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function acknowledge() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "acknowledged");
    } catch {
      // ignored
    }
    setVisible(false);
  }

  if (!visible) return null;

  const t = getCommonLocale(locale).cookie;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label={t.title}
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,46,37,0.18)] sm:p-5"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          {t.body}{" "}
          <Link href="/privacy" className="font-semibold text-emerald-700 underline">
            {t.privacyNotice}
          </Link>{" "}
          {t.forDetails}
        </p>
        <div className="shrink-0">
          <button
            type="button"
            onClick={acknowledge}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
          >
            {t.gotIt}
          </button>
        </div>
      </div>
    </div>
  );
}

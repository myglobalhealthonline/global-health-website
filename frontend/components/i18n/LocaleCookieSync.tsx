"use client";

import { useEffect } from "react";
import { readClientLocale, setClientLocaleCookie } from "@/lib/i18n/get-client-locale";

/** On [lang] pages the URL is the locale source of truth. If the readable
 * gh_locale cookie disagrees (stale or domain-shadowed duplicate from an
 * earlier visit), rewrite it so lang-less pages (/login, /cart, /about)
 * don't flip language. Server re-stamp (proxy.ts) can't fix a shadowed
 * Domain= cookie — only document.cookie sees the winning value. */
export function LocaleCookieSync({ lang }: { lang: string }) {
  useEffect(() => {
    if (readClientLocale() !== lang) setClientLocaleCookie(lang);
  }, [lang]);
  return null;
}

import { resolveLocale } from "./resolve-locale";
import type { LocaleCode } from "./types";

export function readClientLocale(): LocaleCode {
  try {
    const match = document.cookie.match(/(?:^|;\s*)gh_locale=([^;]+)/);
    const raw = match ? decodeURIComponent(match[1]) : "";
    return resolveLocale({ cookieLocale: raw });
  } catch {
    return "en";
  }
}

/**
 * Write the gh_locale cookie. Guarded so it's safe to call from a spot
 * that isn't provably client-only (`typeof document` check) — every
 * current call site is already inside an event handler, so this never
 * changes behavior, it just centralizes the one-liner three switcher
 * components previously duplicated.
 */
export function setClientLocaleCookie(locale: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `gh_locale=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

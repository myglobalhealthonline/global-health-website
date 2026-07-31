import { toSupportedLocale } from "@/lib/i18n/resolve-locale";
import { getSelectedLocale } from "@/lib/i18n/selected-locale";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * @param explicitLocale Wins over the visitor's cookie/header when it maps
 *   to a supported locale — e.g. a blog post's own `locale` field, so a
 *   Portuguese-language article renders its surrounding UI chrome (CTA,
 *   date format, "min read") in Portuguese regardless of the visitor's
 *   browsing locale. Also what a `[country]/[lang]` route passes (the URL
 *   segment) — see below for why that case skips cookies()/headers() too.
 *
 * Without an explicit locale this defers to `getSelectedLocale()` — the
 * person's own choice (signed-in `User.preferredLocale`, else the cookie /
 * Accept-Language chain), so a lang-less page like `/about` renders in the
 * language they picked rather than whatever language the last country URL they
 * touched happened to stamp into the shared cookie.
 *
 * Perf/SEO: `cookies()`/`headers()` are Next.js Dynamic APIs — invoking
 * EITHER of them (even if the result goes unused) forces the whole route to
 * render dynamically, which is what was defeating static generation on the
 * `[country]/[lang]/blog*` pages despite them already knowing the locale
 * from the URL. Short-circuit before touching them whenever `explicitLocale`
 * already resolves to a supported locale — only the lang-less bare routes
 * (`/blog`, `/blog/[slug]`) need the request-derived fallback chain.
 */
export async function getPageLocale(explicitLocale?: string | null): Promise<LocaleCode> {
  const explicit = toSupportedLocale(explicitLocale);
  if (explicit) return explicit;

  return getSelectedLocale();
}

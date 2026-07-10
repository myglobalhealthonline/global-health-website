export const supportedHtmlLangs = new Set(["en", "pt", "es", "cs", "ro", "de"]);

export function toHtmlLang(locale: string): string {
  const base = locale.split("-")[0].toLowerCase();
  return supportedHtmlLangs.has(base) ? base : "en";
}

/**
 * Root `<html lang>` default (P-001).
 *
 * This used to resolve the real per-request locale via `cookies()`/`headers()`
 * — correct, but the root layout wraps every route in the app, so reading a
 * dynamic API there forced the ENTIRE site (including the static-param
 * country routes) to render dynamically. The root layout has no route params
 * of its own (it sits above every route group), so there is no static
 * replacement signal available at that level.
 *
 * "en" is the site-wide default and correct for the true "/" gateway page
 * (no locale chosen yet) and every non-country-scoped page. For
 * `/{country}/{lang}/…` routes, `<HtmlLangSync>` (rendered from the nested
 * `[country]/[lang]/layout.tsx`, which DOES receive `lang` as a real route
 * param) corrects `document.documentElement.lang` client-side after mount —
 * no dynamic API, no flash of un-styled content, a one-line DOM write.
 */
export function getRootHtmlLang(): string {
  return "en";
}

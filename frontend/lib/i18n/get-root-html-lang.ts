export const supportedHtmlLangs = new Set(["en", "pt", "es", "cs", "ro", "de"]);

export function toHtmlLang(locale: string): string {
  const base = locale.split("-")[0].toLowerCase();
  return supportedHtmlLangs.has(base) ? base : "en";
}

/**
 * Root `<html lang>` — a static "en" default, deliberately.
 *
 * P-001: the root layout wraps every route, so reading `headers()` here (the
 * previous implementation read the `x-gh-locale` header stamped by proxy.ts)
 * forces the whole site to render per-request and defeats
 * `generateStaticParams()` on the `[country]/[lang]` tree. Static generation
 * won that trade-off.
 *
 * The real request locale is applied by a synchronous inline script emitted by
 * each subtree layout that knows it — `[country]/[lang]/layout.tsx` (from the
 * route param) and `(site)/(global)/layout.tsx` (from the header) — which runs
 * while the browser is still parsing the stream, before any page content below
 * it is parsed and before hydration. `<HtmlLangSync>` covers client-side soft
 * navigations.
 *
 * KNOWN GAP: a non-JS client (curl, a bare crawler, a social unfurler) sees
 * `lang="en"` in the raw bytes on non-English pages. hreflang / og:locale in
 * <head> are unaffected and still carry the correct language. Closing this
 * properly needs multi-root layouts with `[country]/[lang]` hoisted to
 * root-param level — a whole-app restructure, out of scope here. Do NOT
 * reintroduce `headers()` in this file: it silently un-statics every public
 * route again.
 */
export function getRootHtmlLang(): string {
  return "en";
}

export const supportedHtmlLangs = new Set(["en", "pt", "es", "cs", "ro", "de"]);

export function toHtmlLang(locale: string): string {
  const base = locale.split("-")[0].toLowerCase();
  return supportedHtmlLangs.has(base) ? base : "en";
}

/**
 * Root `<html lang>` — real per-request locale in the initial HTML bytes.
 *
 * Reads the `x-gh-locale` request header stamped by proxy.ts (derived from
 * the URL path for `/{country}/{lang}` routes, cookie/geo elsewhere), so
 * curl/non-JS crawlers/social unfurlers see the correct language, not a
 * JS-corrected one. `<HtmlLangSync>` in `[country]/[lang]/layout.tsx` still
 * covers client-side soft navigations.
 *
 * P-001 note: reading `headers()` here forces every layout-wrapped route
 * dynamic. That is currently a no-op — the `(site)` layout ancestry already
 * blocks static rendering for the whole tree (see P-001), and metadata
 * routes (robots.txt etc.) bypass the root layout. If P-001 is ever fixed
 * and static country pages become possible, this must move to a multi-root
 * layout split instead — do NOT silently revert to a hardcoded "en".
 */
export async function getRootHtmlLang(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const locale = h.get("x-gh-locale");
    return locale ? toHtmlLang(locale) : "en";
  } catch {
    return "en";
  }
}

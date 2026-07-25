export const supportedHtmlLangs = new Set(["en", "pt", "es", "cs", "ro", "de"]);

/**
 * Maps a locale code (or a raw `[lang]` URL segment) to the `<html lang>`
 * value, narrowed to the six languages the site actually ships.
 *
 * Each root layout emits this server-side into the initial response bytes —
 * `[country]/[lang]` from its root params, `(global)` from the locale it
 * already resolves for the nav. There is no longer a `getRootHtmlLang()`
 * returning a hardcoded "en", and no inline script correcting the attribute
 * after the fact: a non-JS client (curl, a bare crawler, an AI crawler, a
 * social unfurler, a screen reader at first paint) now reads the real
 * language straight off the served HTML.
 */
export function toHtmlLang(locale: string): string {
  const base = locale.split("-")[0].toLowerCase();
  return supportedHtmlLangs.has(base) ? base : "en";
}

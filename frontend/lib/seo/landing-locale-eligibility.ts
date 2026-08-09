/**
 * Locales a country's SEO landing page (`/health/[slug]`) is genuinely
 * indexable in — the single source of truth shared by `app/sitemap.ts`
 * (which locale URLs to submit + their hreflang cluster) and the page itself
 * (robots + its own hreflang cluster), so those three can never disagree.
 *
 * International-locale batch (2026-08-09): a locale qualifies only when it
 * BOTH has a real translation row (`availableLocales`, from the backend's
 * `listPublishedLandingSlugs`) AND is one of the country's currently-enabled
 * locales (`supportedLocales`) — either gap alone previously let
 * fallback-locale content (`resolveTranslation`'s exact-locale ->
 * country-default fallback) sit indexed under a foreign-locale URL, same
 * class of bug `exactLocalesForLegalType` fixed for `/legal/*`.
 *
 * Returns the eligible locales in the country's configured order, default
 * locale first, so callers building an hreflang/x-default map get a
 * deterministic pick rather than one dependent on array/Set insertion order.
 */
export function eligibleLandingLocales(
  availableLocales: readonly string[],
  supportedLocales: readonly string[],
  defaultLocale: string,
): string[] {
  const available = new Set(availableLocales.map((l) => l.toLowerCase()));
  const def = defaultLocale.toLowerCase();
  const supported =
    supportedLocales.length > 0 ? supportedLocales.map((l) => l.toLowerCase()) : [def];
  const ordered = [def, ...supported.filter((l) => l !== def)];
  return ordered.filter((l) => available.has(l));
}

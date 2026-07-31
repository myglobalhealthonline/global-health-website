/**
 * Which `[lang]` segment a `/{country}/{lang}` link should carry.
 *
 * Rule: the language the person selected, whenever the target country serves
 * it; that country's default only as a fallback. Every country-link builder
 * (entry gate, country switcher, mobile nav, the portal's "Book consultation"
 * CTA and sidebar logo) goes through here — before this, some of them used the
 * COUNTRY's default locale and some kept the current URL's lang, so a visitor
 * reading the site in English got dropped onto `/portugal/pt`, and a visitor
 * who picked Portuguese got dropped onto `/portugal/en`.
 *
 * Client-safe (no server imports) — the switchers are client components.
 */
export function countryLinkLocale(
  selected: string | null | undefined,
  country: { supportedLocales?: readonly string[] | null; defaultLocale?: string | null },
): string {
  const wanted = selected?.toLowerCase();
  const supported = (country.supportedLocales ?? []).map((l) => l.toLowerCase());
  if (wanted && supported.includes(wanted)) return wanted;
  return (country.defaultLocale ?? "en").toLowerCase();
}

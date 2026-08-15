import type { CountryCode } from "@/data/countries";
import type { LocaleCode } from "@/lib/i18n/types";
import enMarkets from "@/locales/en/faq-markets.json";
import ptMarkets from "@/locales/pt/faq-markets.json";
import esMarkets from "@/locales/es/faq-markets.json";
import csMarkets from "@/locales/cs/faq-markets.json";
import roMarkets from "@/locales/ro/faq-markets.json";
import deMarkets from "@/locales/de/faq-markets.json";

/**
 * Per-market FAQ copy for `/{country}/{lang}/faq`.
 *
 * Deliberately NOT part of `faq.json` and NOT run through `deepMergeLocale`.
 * That merge exists so a missing key silently falls back to English, which is
 * right for UI chrome and wrong here: an English answer under a translated
 * heading, emitted as `FAQPage` schema on a YMYL medical page, is a quality
 * signal pointing the wrong way (see the 2026-08-15 note in
 * `docs/plans/seo-control-state.md`). This module keeps the fallback but makes
 * it VISIBLE — `exact` tells the caller whether the copy is genuinely in the
 * requested locale, so the page can noindex the ones that are not and the
 * sitemap can decline to submit them.
 *
 * Same rule `exactLocalesForLegalType` applies to `/legal/*`: a locale is only
 * advertised (hreflang, sitemap, index) when it has its own content.
 */

export type MarketFaqItem = { question: string; answer: string };
export type MarketFaqGroup = { eyebrow: string; title: string; items: MarketFaqItem[] };
export type MarketFaqDoc = Partial<Record<CountryCode, { groups: MarketFaqGroup[] }>>;

const BY_LOCALE: Record<LocaleCode, MarketFaqDoc> = {
  en: enMarkets as MarketFaqDoc,
  pt: ptMarkets as MarketFaqDoc,
  es: esMarkets as MarketFaqDoc,
  cs: csMarkets as MarketFaqDoc,
  ro: roMarkets as MarketFaqDoc,
  de: deMarkets as MarketFaqDoc,
};

const LOCALES = Object.keys(BY_LOCALE) as LocaleCode[];

/** A market entry counts as present only when it actually carries questions. */
function groupsFor(locale: LocaleCode, code: CountryCode): MarketFaqGroup[] | null {
  const groups = BY_LOCALE[locale]?.[code]?.groups;
  if (!groups || groups.length === 0) return null;
  return groups.some((g) => g.items.length > 0) ? groups : null;
}

/**
 * Market FAQ groups for this country in this locale.
 *
 * `exact` is false when the copy came from a fallback locale (the market's own
 * default, then English). The caller MUST noindex a non-exact rendering — the
 * page still serves so a visitor reading, say, German in Ireland gets a usable
 * answer, but Google is not asked to index six near-identical language shells.
 *
 * Returns null when no locale has copy for this market at all, which is the
 * signal to fall back to the generic FAQ the route shipped with.
 */
export function getMarketFaq(
  code: CountryCode,
  locale: LocaleCode,
  countryDefaultLocale: LocaleCode,
): { groups: MarketFaqGroup[]; exact: boolean } | null {
  const own = groupsFor(locale, code);
  if (own) return { groups: own, exact: true };
  for (const fallback of [countryDefaultLocale, "en" as LocaleCode]) {
    const groups = groupsFor(fallback, code);
    if (groups) return { groups, exact: false };
  }
  return null;
}

/**
 * Locales holding their own market FAQ copy for this country — the exact set
 * that may be submitted to the sitemap, cross-referenced by hreflang, and
 * rendered `index,follow`. Empty means no market copy exists yet.
 */
export function marketFaqLocales(code: CountryCode): LocaleCode[] {
  return LOCALES.filter((locale) => groupsFor(locale, code) !== null);
}

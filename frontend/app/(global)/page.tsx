import type { Metadata } from "next";
import { CountryEntryGate } from "@/components/sections/CountryEntryGate";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { getCountryDoctors } from "@/lib/content/get-country-collections";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getSelectedLocale } from "@/lib/i18n/selected-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { hreflangRegion } from "@/lib/seo/hreflang";
import { countrySlug } from "@/lib/routing/country-slug";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const { hero } = loadLocaleBundle(locale).home;

  // Hreflang cluster for the gate: `/` is not country-specific (one URL,
  // content-negotiated by cookie/Accept-Language, not a `[country]/[lang]`
  // segment), so `hreflangAlternates(country, suffix)` — built for a single
  // country's full locale set — doesn't apply directly. Instead this is a
  // one-row-per-market cluster: each live country's own DEFAULT-locale
  // homepage is its regional alternate (e.g. `pt-PT` → `/portugal/pt`,
  // `en-IE` → `/ireland/en`), and `/` itself is `x-default` — the gate is
  // where every visitor with no established country/locale preference should
  // land, exactly as it behaves today. A full cross-product (every country ×
  // every locale it supports) would be technically valid too, but it would
  // hreflang the gate to, e.g., a Czech-language Brazil page that no
  // navigation on the gate itself links to — the default-locale set matches
  // what a visitor actually reaches from here.
  const countries = await getPublicCountriesMerged();
  const languages: Record<string, string> = { "x-default": "/" };
  for (const country of countries) {
    const region = hreflangRegion(country.code);
    const lang = (country.defaultLocale ?? "en").toLowerCase();
    languages[`${lang}-${region}`] = `/${countrySlug(country.code)}/${lang}`;
  }

  // The visible hero sells the promise; the SERP snippet has to answer the
  // query. `/` is the country picker, but Google ranks it for the commercial
  // head terms ("global health clinic", "global health medical services" —
  // ~200 impressions, 0 clicks over 28 days) because the hero copy names
  // neither the service nor the markets. seoTitle/seoDescription do both,
  // without touching what visitors see. Fall back to the hero copy so a
  // locale that has not translated them yet still gets its own language.
  return buildPublicMetadata({
    path: "/",
    title: hero.seoTitle || hero.title,
    description: hero.seoDescription || hero.description,
    locale,
    kind: "page",
    subtitle: hero.eyebrow,
    imageAlt: `${hero.title} - Global Health`,
    languages,
  });
}

export default async function HomePage() {
  // The visitor's own language, resolved server-side so the entry gate renders
  // in it with no flicker and no manual language step: signed-in
  // `User.preferredLocale` → gh_locale cookie / x-gh-locale → Accept-Language →
  // "en". The edge proxy stamps x-gh-locale from Accept-Language for "/", so a
  // Czech browser with no history still lands on Czech copy.
  const detectedLocale = await getSelectedLocale();
  const copy = loadLocaleBundle(detectedLocale).common.entryGate;

  // getPublicCountriesMerged also warms the slug↔code registry that the
  // synchronous countryCodeFromSlug helpers downstream depend on — don't
  // remove this call without re-routing those callers.
  const countries = await getPublicCountriesMerged();

  // Live aggregate for the entry gate's citable stat line (GEO/AI-citability:
  // real count, no fabricated numbers). One getCountryDoctors call per
  // country, same helper the country home pages already use to count
  // doctors — parallelized and request-deduped via React `cache()`.
  const doctorCounts = await Promise.all(
    countries.map((c) => getCountryDoctors(c.code, detectedLocale)),
  );
  const doctorCount = doctorCounts.reduce((sum, list) => sum + list.length, 0);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: "/" }])} />
      <CountryEntryGate
        countries={countries}
        detectedLocale={detectedLocale}
        copy={copy}
        doctorCount={doctorCount}
      />
    </>
  );
}

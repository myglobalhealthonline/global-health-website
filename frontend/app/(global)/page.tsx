import type { Metadata } from "next";
import { CountryEntryGate } from "@/components/sections/CountryEntryGate";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { getCountryDoctors } from "@/lib/content/get-country-collections";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getSelectedLocale } from "@/lib/i18n/selected-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const { hero } = loadLocaleBundle(locale).home;

  // NO hreflang cluster here, deliberately (SEO-FOUNDATION-004, 2026-08-13).
  //
  // `/` used to emit one `{defaultLang}-{REGION}` row per market plus
  // `x-default` → itself, and each market's default-locale home emitted a
  // language-only row back (`pt` → `/`, `en` → `/`, …). That made six pages
  // each declare this single URL to be a different language — `en`, `cs`,
  // `pt` (twice, from Portugal and Brazil), `es`, `ro` — while `/` declared
  // itself `x-default`. At most one of those claims can be true.
  //
  // The deeper problem is that `/` is not an alternate version of any market
  // homepage at all: it is a country/language selector at one URL,
  // content-negotiated by cookie/Accept-Language, with no services, pricing
  // or market entity behind it. So the relationship is removed rather than
  // repaired, leaving six clean per-market clusters that each keep their own
  // `x-default`. Google's model would also permit a selector page to act as
  // the single global `x-default`, but only as the full country x locale
  // cross-product, and that would dissolve those per-market clusters.
  //
  // The gate still links every market in the page body — that is what
  // `CountryEntryGate` is. Do not "restore" an alternates map here without
  // deciding the whole-site cluster shape first.

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
  });
}

export default async function HomePage() {
  // The visitor's own language, resolved server-side so the entry gate renders
  // in it with no flicker and no manual language step: signed-in
  // `User.preferredLocale` → gh_locale cookie / x-gh-locale → Accept-Language →
  // "en". The edge proxy stamps x-gh-locale from Accept-Language for "/", so a
  // Czech browser with no history still lands on Czech copy.
  const detectedLocale = await getSelectedLocale();
  const common = loadLocaleBundle(detectedLocale).common;
  const copy = common.entryGate;

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
      <JsonLd data={breadcrumbJsonLd([{ name: common.navigation.home, url: "/" }])} />
      <CountryEntryGate
        countries={countries}
        detectedLocale={detectedLocale}
        copy={copy}
        doctorCount={doctorCount}
      />
    </>
  );
}

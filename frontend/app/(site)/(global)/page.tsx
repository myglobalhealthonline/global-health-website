import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { CountryEntryGate } from "@/components/sections/CountryEntryGate";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const { hero } = loadLocaleBundle(locale).home;

  return buildPublicMetadata({
    path: "/",
    title: hero.title,
    description: hero.description,
    locale,
    kind: "page",
    subtitle: hero.eyebrow,
    imageAlt: `${hero.title} - Global Health`,
  });
}

export default async function HomePage() {
  const requestHeaders = await headers();
  const cookieStore = await cookies();

  // Detect the visitor's language server-side so the entry gate renders in
  // their browser language with no flicker and no manual language step.
  // Priority (resolveLocale): x-gh-locale header → gh_locale cookie →
  // Accept-Language → "en". The edge middleware already stamps x-gh-locale
  // from Accept-Language for "/", so a Czech browser lands on Czech copy.
  const detectedLocale = resolveLocale({
    headerLocale: requestHeaders.get("x-gh-locale"),
    cookieLocale: cookieStore.get("gh_locale")?.value,
    acceptLanguageHeader: requestHeaders.get("accept-language"),
  });
  const copy = loadLocaleBundle(detectedLocale).common.entryGate;

  // getPublicCountriesMerged also warms the slug↔code registry that the
  // synchronous countryCodeFromSlug helpers downstream depend on — don't
  // remove this call without re-routing those callers.
  const countries = await getPublicCountriesMerged();
  return (
    <CountryEntryGate
      countries={countries}
      detectedLocale={detectedLocale}
      copy={copy}
    />
  );
}

import { cookies, headers } from "next/headers";
import { CountryEntryGate } from "@/components/sections/CountryEntryGate";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { pageMetadata } from "@/lib/seo/page-seo";
import { getPublicDoctorsNormalized } from "@/lib/content/get-public-doctors";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const metadata = pageMetadata("/");

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
  const allDoctors = await getPublicDoctorsNormalized();
  const countryMeta: Record<string, { doctors: number }> = {};
  for (const c of countries) {
    countryMeta[c.code] = {
      doctors: allDoctors.filter((d) => d.countryCode === c.code).length,
    };
  }
  return (
    <CountryEntryGate
      countries={countries}
      countryMeta={countryMeta}
      detectedLocale={detectedLocale}
      copy={copy}
    />
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSiteContext } from "@/lib/content/get-site-context";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { getPublicAssetsNormalized } from "@/lib/content/get-public-assets";
import { resolveSiteLogoAsset } from "@/lib/content/merge-ireland-home-media";
import { DEFAULT_BRAND_LOGO_LIGHT } from "@/lib/content/brand-logo";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getCountryByCode, type CountryCode } from "@/data/countries";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicAuthLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();

  const headerCountry = requestHeaders.get("x-gh-country");
  const runtimeCountry =
    headerCountry && getCountryByCode(headerCountry as CountryCode)
      ? (headerCountry as CountryCode)
      : undefined;

  const roleHeader = requestHeaders.get("x-gh-role");
  const emailHeader = requestHeaders.get("x-gh-email");
  const authUser: { role: string; email: string | null } | null = roleHeader
    ? { role: roleHeader, email: emailHeader }
    : null;

  const [{ common, navigation }, assets, countriesMerged] = await Promise.all([
    getSiteContext({
      explicitCountryCode: runtimeCountry,
      headerLocale: requestHeaders.get("x-gh-locale"),
      acceptLanguageHeader: requestHeaders.get("accept-language"),
      cookieLocale: cookieStore.get("gh_locale")?.value ?? null,
    }),
    getPublicAssetsNormalized(),
    getPublicCountriesMerged(),
  ]);

  const brandLogo = resolveSiteLogoAsset(assets) ?? DEFAULT_BRAND_LOGO_LIGHT;

  const currentLocale = resolveLocale({
    headerLocale: requestHeaders.get("x-gh-locale"),
    cookieLocale: cookieStore.get("gh_locale")?.value,
    acceptLanguageHeader: requestHeaders.get("accept-language"),
    countryDefaultLocale:
      runtimeCountry ? getCountryByCode(runtimeCountry)?.defaultLocale : undefined,
  });

  const lastCountryRaw = cookieStore.get("gh-last-country")?.value;
  let initialLastCountry: { slug: string; lang: string } | null = null;
  if (lastCountryRaw) {
    const [slug, lang] = lastCountryRaw.split(":");
    if (slug && lang) initialLastCountry = { slug, lang };
  }

  const countryFeatures: Record<string, string[] | undefined> = {};
  for (const c of countriesMerged) {
    if (c.enabledFeatures) countryFeatures[c.code] = c.enabledFeatures;
  }

  return (
    <>
      <SiteHeader
        siteName={common.site.name}
        navigation={navigation}
        brandLogo={brandLogo}
        authUser={authUser}
        countryFeatures={countryFeatures}
        initialLastCountry={initialLastCountry}
        countries={countriesMerged}
        currentLocale={currentLocale}
      />
      {children}
    </>
  );
}

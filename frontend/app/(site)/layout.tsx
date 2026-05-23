import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { CartProvider } from "@/components/cart/CartContext";
import { JsonLd } from "@/components/seo/JsonLd";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getPublicAssetsNormalized } from "@/lib/content/get-public-assets";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { DEFAULT_BRAND_LOGO, DEFAULT_BRAND_LOGO_LIGHT } from "@/lib/content/brand-logo";
import {
  resolveFooterCtaDecorAsset,
  resolveSiteLogoAsset,
} from "@/lib/content/merge-ireland-home-media";
import { getSiteContext } from "@/lib/content/get-site-context";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import {
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/structured-data";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();

  const headerCountry = requestHeaders.get("x-gh-country");
  const runtimeCountry =
    headerCountry && getCountryByCode(headerCountry as CountryCode)
      ? (headerCountry as CountryCode)
      : undefined;

  const [{ common, navigation }, assets, authUser, countriesMerged] = await Promise.all([
    getSiteContext({
      explicitCountryCode: runtimeCountry,
      headerLocale: requestHeaders.get("x-gh-locale"),
      acceptLanguageHeader: requestHeaders.get("accept-language"),
      cookieLocale: cookieStore.get("gh_locale")?.value ?? null,
    }),
    getPublicAssetsNormalized(),
    getServerAuthUser(),
    getPublicCountriesMerged(),
  ]);

  const brandLogo = resolveSiteLogoAsset(assets) ?? DEFAULT_BRAND_LOGO_LIGHT;
  const footerDecorImage = resolveFooterCtaDecorAsset(assets);

  // Read the gh-last-country cookie server-side so the header renders
  // the remembered country + lang on the first paint. Without this,
  // useLastCountry() resolves only after the client-side effect runs
  // and the header flashes the global IA before swapping in the
  // country-scoped one — looks broken on /about, /blog, /faq.
  const lastCountryRaw = cookieStore.get("gh-last-country")?.value;
  let initialLastCountry: { slug: string; lang: string } | null = null;
  if (lastCountryRaw) {
    const [slug, lang] = lastCountryRaw.split(":");
    if (slug && lang) initialLastCountry = { slug, lang };
  }

  // Build a code → enabledFeatures map so SiteHeader/MobileNav can hide
  // nav tabs the admin has disabled per-country via /admin/country-features.
  const countryFeatures: Record<string, string[] | undefined> = {};
  for (const c of countriesMerged) {
    if (c.enabledFeatures) countryFeatures[c.code] = c.enabledFeatures;
  }

  return (
    <CartProvider>
      <SiteChrome
        siteName={common.site.name}
        navigation={navigation}
        brandLogo={brandLogo}
        footerDecorImage={footerDecorImage}
        authUser={authUser}
        countryFeatures={countryFeatures}
        initialLastCountry={initialLastCountry}
        countries={countriesMerged}
      >
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        {children}
      </SiteChrome>
    </CartProvider>
  );
}

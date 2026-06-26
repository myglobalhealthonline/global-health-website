import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { CartProvider } from "@/components/cart/CartContext";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublicAssetsNormalized } from "@/lib/content/get-public-assets";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { getCountryFooter } from "@/lib/content/get-country-footers";
import { getCountryTrust } from "@/lib/content/get-country-trust";
import { DEFAULT_BRAND_LOGO_LIGHT } from "@/lib/content/brand-logo";
import {
  resolveFooterCtaDecorAsset,
  resolveSiteLogoAsset,
} from "@/lib/content/merge-ireland-home-media";
import { getSiteContext } from "@/lib/content/get-site-context";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
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

  // Role + email stamped by the edge proxy via local JWT decode — no backend
  // round-trip. Email drives the header's personal avatar (initial only).
  const roleHeader = requestHeaders.get("x-gh-role");
  const emailHeader = requestHeaders.get("x-gh-email");
  const authUser: { role: string; email: string | null } | null = roleHeader
    ? { role: roleHeader, email: emailHeader }
    : null;

  // runtimeCountry is known here, so the per-country footer fetch can run
  // in the same parallel batch instead of as an extra serial round-trip
  // after it (one less hop on every (site) page's TTFB).
  const [{ common, navigation }, assets, countriesMerged, activeFooter, activeTrust] =
    await Promise.all([
      getSiteContext({
        explicitCountryCode: runtimeCountry,
        headerLocale: requestHeaders.get("x-gh-locale"),
        acceptLanguageHeader: requestHeaders.get("accept-language"),
        cookieLocale: cookieStore.get("gh_locale")?.value ?? null,
      }),
      getPublicAssetsNormalized(),
      getPublicCountriesMerged(),
      runtimeCountry ? getCountryFooter(runtimeCountry) : Promise.resolve(null),
      runtimeCountry ? getCountryTrust(runtimeCountry) : Promise.resolve(null),
    ]);

  // Organization `sameAs` — the active country's official authorities (IMC,
  // ERS, OM, DPC, CNPD…). This is the JSON-LD authority signal that earns
  // AI-search citation. Outside a country scope it stays empty.
  const organizationSameAs = activeTrust
    ? activeTrust.authorityLinks.filter((l) => l.showInSchema).map((l) => l.url)
    : [];

  const brandLogo = resolveSiteLogoAsset(assets) ?? DEFAULT_BRAND_LOGO_LIGHT;
  const footerDecorImage = resolveFooterCtaDecorAsset(assets);

  // Same locale resolution the nav copy uses — passed to the header so the
  // language switcher displays the locale the page actually rendered in
  // (URL lang > gh_locale cookie > Accept-Language), instead of guessing
  // from the last-country cookie on global pages like /about and /blog.
  const currentLocale = resolveLocale({
    headerLocale: requestHeaders.get("x-gh-locale"),
    cookieLocale: cookieStore.get("gh_locale")?.value,
    acceptLanguageHeader: requestHeaders.get("accept-language"),
    countryDefaultLocale:
      runtimeCountry ? getCountryByCode(runtimeCountry)?.defaultLocale : undefined,
  });

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

  // Per-country footer override (admin-managed). Only the active country's
  // row is fetched (in the Promise.all above) — SiteFooter doesn't render
  // footers for other countries, so requesting all 5 every layout render
  // would burn 4 round-trips for data nothing reads. Outside a country
  // scope (entry gate / global pages) the fetch is skipped and SiteFooter
  // falls back to its defaults.
  const countryFooters: Record<string, typeof activeFooter> = {};
  if (runtimeCountry) {
    countryFooters[runtimeCountry.toLowerCase()] = activeFooter;
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
        countryFooters={countryFooters}
        countryTrust={activeTrust}
        initialLastCountry={initialLastCountry}
        countries={countriesMerged}
        currentLocale={currentLocale}
      >
        <JsonLd data={[organizationJsonLd(organizationSameAs), websiteJsonLd()]} />
        {children}
      </SiteChrome>
    </CartProvider>
  );
}

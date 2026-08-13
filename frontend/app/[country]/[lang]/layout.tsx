import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { RootDocument } from "@/app/_components/RootDocument";
import { PublicAuthProvider } from "@/components/layout/PublicAuthContext";
import { CartProvider } from "@/components/cart/CartContext";
import { MetaPixel } from "@/components/compliance/MetaPixel";
import { GoogleAnalytics } from "@/components/compliance/GoogleAnalytics";
import { MicrosoftClarity } from "@/components/compliance/MicrosoftClarity";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublicAssetsNormalized } from "@/lib/content/get-public-assets";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { getCountryFooter, type PublicCountryFooter } from "@/lib/content/get-country-footers";
import { getCountryTrust } from "@/lib/content/get-country-trust";
import { DEFAULT_BRAND_LOGO_LIGHT } from "@/lib/content/brand-logo";
import {
  resolveFooterCtaDecorAsset,
  resolveSiteLogoAsset,
} from "@/lib/content/merge-ireland-home-media";
import { getSiteContext } from "@/lib/content/get-site-context";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { countryLangParams } from "@/lib/routing/static-params";
import { aggregateRatingJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";
import { fetchPublicReviewConfig, resolvePrimaryAggregate } from "@/lib/api/reviews-config";
import { rootMetadata } from "@/lib/seo/root-metadata";
import { toHtmlLang } from "@/lib/i18n/html-lang";
import { LocaleCookieSync } from "@/components/i18n/LocaleCookieSync";
import type { ParsedSitePath } from "@/lib/routing/path-rewrites";

/**
 * ROOT layout for the country/lang public site — it owns `<html>`/`<body>`.
 *
 * It sits at `app/[country]/[lang]/` rather than under a shared
 * `app/layout.tsx` because the layout that renders `<html>` has to be the one
 * that knows the locale. A single app-wide root layout sits ABOVE every
 * dynamic segment, so it could only learn the locale from `headers()` — which
 * would force every route to render per-request and defeat
 * `generateStaticParams()` below (P-001). That is why `<html lang>` used to
 * ship a hardcoded "en" patched by an inline script, invisible to any client
 * that doesn't run JS.
 *
 * Country/locale still come from real route PARAMS, never
 * headers()/cookies() — that's what keeps this subtree statically
 * generable. `generateStaticParams` prerenders the known country x locale
 * combinations at build time; anything else (an admin-added country, say)
 * still resolves on demand and gets cached via ISR (`dynamicParams`
 * defaults to true).
 */
export const metadata = rootMetadata;

export function generateStaticParams() {
  return countryLangParams();
}

export default async function CountryLangRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ country: string; lang: string }>;
}) {
  const [{ country: slug, lang }, countriesMerged] = await Promise.all([
    params,
    getPublicCountriesMerged(),
  ]);

  const code = countryCodeFromSlug(slug);
  if (!code) notFound();
  // Resolve against the admin/DB-merged list first so an admin-added
  // country renders instead of 404ing and an admin-edited defaultLocale
  // takes effect (§4/§8/§9 of the locale investigation). The static seed
  // (`getCountryByCode`) is only the fallback for a merge-fetch failure —
  // `getPublicCountriesMerged` already falls back to the seed itself in
  // that case, so this is defense in depth, not the primary path.
  const config = countriesMerged.find((c) => c.code === code) ?? getCountryByCode(code);
  if (!config) notFound();
  // Admin's supportedLocales is the sole source of truth for which locale
  // URLs exist for this country — resolveLocale() below only validates
  // against the site-wide 6-locale set, not per-country, so without this a
  // country restricted to e.g. 3 locales would still silently 200 the other
  // 3 (params-only check keeps this static-generation-safe — no headers()).
  if (!config.supportedLocales.some((l) => l.toLowerCase() === lang.toLowerCase())) {
    notFound();
  }

  const currentLocale = resolveLocale({
    explicitLocale: lang,
    countryDefaultLocale: config.defaultLocale,
  });

  const [{ common, navigation }, assets, activeFooter, activeTrust, reviewConfigResult] =
    await Promise.all([
      getSiteContext({ explicitCountryCode: code, explicitLocale: lang }),
      getPublicAssetsNormalized(),
      getCountryFooter(code, currentLocale),
      getCountryTrust(code, currentLocale),
      fetchPublicReviewConfig().catch(() => null),
    ]);

  // Organization `sameAs` — this country's official authorities (IMC, ERS,
  // OM, DPC, CNPD…). The E-E-A-T signal AI-search citation reads.
  const organizationSameAs = activeTrust
    ? activeTrust.authorityLinks.filter((l) => l.showInSchema).map((l) => l.url)
    : [];

  // SEO audit 3.2 — AggregateRating on the site-wide MedicalOrganization
  // node. Fails closed: undefined unless admin has configured a
  // primaryProvider AND that provider has a real, fresh aggregate saved
  // (see aggregateRatingJsonLd's guard) — renders nothing until an admin
  // enters real numbers at /admin/settings/reviews.
  const aggregateRating = aggregateRatingJsonLd(
    resolvePrimaryAggregate(reviewConfigResult && reviewConfigResult.ok ? reviewConfigResult.data : null),
  );

  const brandLogo = resolveSiteLogoAsset(assets) ?? DEFAULT_BRAND_LOGO_LIGHT;
  const footerDecorImage = resolveFooterCtaDecorAsset(assets);

  // Build a code -> enabledFeatures map so SiteHeader/MobileNav can hide
  // nav tabs the admin has disabled per-country via /admin/country-features.
  const countryFeatures: Record<string, string[] | undefined> = {};
  for (const c of countriesMerged) {
    if (c.enabledFeatures) countryFeatures[c.code] = c.enabledFeatures;
  }

  const countryFooters: Record<string, PublicCountryFooter | null> = {
    [code.toLowerCase()]: activeFooter,
  };

  // Real route params, not a header-parsed pathname — `rest` is unused by
  // SiteHeader/SiteFooter (active-tab state is client-side in SectionNav).
  const parsed: ParsedSitePath = { country: slug, lang, rest: [] };

  // WCAG 3.1.1 (A11Y-001): the true request locale, in the initial response
  // bytes — no inline correction script, no post-hydration fixup.
  //
  // Read straight off the route param, NOT `lang()` from next/root-params:
  // this layout already has the segment, and the getter measurably
  // mis-resolved during prerender (a country's own default locale — /spain/es,
  // /czechia/cs — came out "en" while every other combination was correct).
  // Hoisting this layout to root-param level is what makes the server-rendered
  // `lang` possible; actually calling the getter here buys nothing.
  const htmlLang = toHtmlLang(lang);

  return (
    <RootDocument lang={htmlLang}>
      <PublicAuthProvider>
        <CartProvider>
          <MetaPixel />
          <GoogleAnalytics />
          <MicrosoftClarity />
          <LocaleCookieSync lang={lang} />
          <SiteChrome
            siteName={common.site.name}
            navigation={navigation}
            brandLogo={brandLogo}
            footerDecorImage={footerDecorImage}
            countryFeatures={countryFeatures}
            countryFooters={countryFooters}
            countryTrust={activeTrust}
            initialLastCountry={null}
            countries={countriesMerged}
            currentLocale={currentLocale}
            parsed={parsed}
            isGatewayHome={false}
          >
            <JsonLd
              data={[organizationJsonLd(organizationSameAs, aggregateRating), websiteJsonLd()]}
            />
            {children}
          </SiteChrome>
        </CartProvider>
      </PublicAuthProvider>
    </RootDocument>
  );
}

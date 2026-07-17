import type { ReactNode } from "react";
import { notFound } from "next/navigation";
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
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";
import { toHtmlLang } from "@/lib/i18n/get-root-html-lang";
import { HtmlLangSync } from "@/components/layout/HtmlLangSync";
import { LocaleCookieSync } from "@/components/i18n/LocaleCookieSync";
import type { ParsedSitePath } from "@/lib/routing/path-rewrites";

/**
 * Country/lang chrome layout (P-001). Unlike the sibling `(global)` layout,
 * this one takes country/locale from real route PARAMS, never
 * headers()/cookies() — that's what makes every page under this subtree
 * eligible for static generation. `generateStaticParams` below prerenders
 * the known country x locale combinations at build time; anything else
 * (an admin-added country, say) still resolves on demand and gets cached
 * via ISR (`dynamicParams` defaults to true).
 *
 * Owns everything the old single `(site)/layout.tsx` used to compute from
 * headers/cookies for the in-country case: SiteChrome (header/footer),
 * per-country footer/trust data, and the org-scoped JSON-LD. Auth
 * personalization, CartProvider, and MetaPixel live one level up in the
 * pass-through `(site)/layout.tsx` — shared by this subtree and `(global)`.
 */
export function generateStaticParams() {
  return countryLangParams();
}

export default async function CountryLangLayout({
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

  const currentLocale = resolveLocale({
    explicitLocale: lang,
    countryDefaultLocale: config.defaultLocale,
  });

  const [{ common, navigation }, assets, activeFooter, activeTrust] =
    await Promise.all([
      getSiteContext({ explicitCountryCode: code, explicitLocale: lang }),
      getPublicAssetsNormalized(),
      getCountryFooter(code, currentLocale),
      getCountryTrust(code, currentLocale),
    ]);

  // Organization `sameAs` — this country's official authorities (IMC, ERS,
  // OM, DPC, CNPD…). The E-E-A-T signal AI-search citation reads.
  const organizationSameAs = activeTrust
    ? activeTrust.authorityLinks.filter((l) => l.showInSchema).map((l) => l.url)
    : [];

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

  const htmlLang = toHtmlLang(lang);

  return (
    <>
      {/* WCAG 3.1.1 (A11Y-001): the shared root layout ships a static
       * lang="en" <html> (see getRootHtmlLang() — reading the request locale
       * there would force the whole site, including every statically
       * generated country/lang combo, to render dynamically). This inline
       * script runs synchronously as the browser parses the HTML stream —
       * before hydration, and before any real page content downstream of it
       * is parsed — so it corrects `document.documentElement.lang` to the
       * true request locale ahead of anything assistive tech would read.
       * HtmlLangSync stays as a no-op-if-already-correct React fallback for
       * the (rare) case JS parses this script but a later client nav skips
       * a full document load. Not equivalent to a server-emitted attribute
       * on the initial response bytes — see CLAUDE.md/report for the full
       * fix (multi-root layouts) this was weighed against and why it was
       * out of scope here. */}
      <script
        // eslint-disable-next-line react/no-danger -- static, non-user-derived string; sets documentElement.lang ahead of hydration
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang=${JSON.stringify(htmlLang)};`,
        }}
      />
      <HtmlLangSync lang={htmlLang} />
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
        <JsonLd data={[organizationJsonLd(organizationSameAs), websiteJsonLd()]} />
        {children}
      </SiteChrome>
    </>
  );
}

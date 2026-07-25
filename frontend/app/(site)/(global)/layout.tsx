import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { HtmlLangSync } from "@/components/layout/HtmlLangSync";
import { toHtmlLang } from "@/lib/i18n/get-root-html-lang";
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
import type { CountryCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { parseSitePath } from "@/lib/routing/path-rewrites";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";

/**
 * Chrome layout for pages with NO country/lang URL segment (P-001): the
 * gateway home, /about, /blog, /cart, /checkout, /contact, /faq,
 * /patient-upload, /privacy, /reviews, /terms, /verify, /brazil,
 * /card-verify. These genuinely have no route param to derive country/
 * locale from, so — unlike the `[country]/[lang]` sibling layout — this one
 * still reads headers()/cookies() to guess a "last known country" for
 * header/footer IA. That keeps this subtree dynamic, which is fine: it's
 * not the SEO-critical bulk of the site.
 *
 * CartProvider, PublicAuthProvider, and MetaPixel live one level up in the
 * pass-through `(site)/layout.tsx`, shared by this subtree and
 * `[country]/[lang]` — not duplicated here.
 */
export default async function GlobalSiteLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();

  // Fetch the admin/DB-merged list up front (falls back to the static seed
  // internally on a backend error) so an admin-added country is recognized
  // here and its admin-edited defaultLocale is used below, instead of only
  // the static seed (§4/§8 of the locale investigation).
  const countriesMerged = await getPublicCountriesMerged();
  const mergedByCode = new Map(countriesMerged.map((c) => [c.code, c] as const));

  const pathname = requestHeaders.get("x-gh-pathname") ?? "/";
  const headerCountry = requestHeaders.get("x-gh-country");

  // The edge proxy only knows the seeded country list, so admin-added countries
  // may resolve to the fallback (Ireland). Use the URL pathname as the source of
  // truth whenever it contains a recognizable country slug.
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  const urlCountryCode = firstSegment ? countryCodeFromSlug(firstSegment) : null;
  const resolvedCountryCode = urlCountryCode ?? headerCountry ?? null;
  const runtimeCountry =
    resolvedCountryCode && mergedByCode.has(resolvedCountryCode as CountryCode)
      ? (resolvedCountryCode as CountryCode)
      : undefined;
  const runtimeCountryConfig = runtimeCountry ? mergedByCode.get(runtimeCountry) : undefined;

  // Same locale resolution the nav copy uses (URL lang > gh_locale cookie >
  // Accept-Language). Resolved up front so it can also select the footer/
  // trust translation below, instead of only driving the header's language
  // switcher after the fact.
  const currentLocale = resolveLocale({
    headerLocale: requestHeaders.get("x-gh-locale"),
    cookieLocale: cookieStore.get("gh_locale")?.value,
    acceptLanguageHeader: requestHeaders.get("accept-language"),
    countryDefaultLocale: runtimeCountryConfig?.defaultLocale,
  });

  // runtimeCountry is known here, so the per-country footer fetch can run
  // in the same parallel batch instead of as an extra serial round-trip
  // after it (one less hop on every global page's TTFB).
  const [{ common, navigation }, assets, activeFooter, activeTrust] =
    await Promise.all([
      getSiteContext({
        explicitCountryCode: runtimeCountry,
        headerLocale: requestHeaders.get("x-gh-locale"),
        acceptLanguageHeader: requestHeaders.get("accept-language"),
        cookieLocale: cookieStore.get("gh_locale")?.value ?? null,
      }),
      getPublicAssetsNormalized(),
      runtimeCountry ? getCountryFooter(runtimeCountry, currentLocale) : Promise.resolve(null),
      runtimeCountry ? getCountryTrust(runtimeCountry, currentLocale) : Promise.resolve(null),
    ]);

  // Organization `sameAs` — the active country's official authorities (IMC,
  // ERS, OM, DPC, CNPD…). This is the JSON-LD authority signal that earns
  // AI-search citation. Outside a country scope it stays empty.
  const organizationSameAs = activeTrust
    ? activeTrust.authorityLinks.filter((l) => l.showInSchema).map((l) => l.url)
    : [];

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

  // SiteHeader/SiteFooter/SiteChrome are Server Components — they need the
  // parsed pathname as a prop instead of calling usePathname() themselves.
  // Safe to parse here: getPublicCountriesMerged() (above) already warmed
  // the slug registry that parseSitePath's country-slug lookup relies on.
  const parsed = parseSitePath(pathname);
  const isGatewayHome = pathname === "/";

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

  const htmlLang = toHtmlLang(currentLocale);

  return (
    <>
      {/* The root layout now ships a static lang="en" <html> (P-001 — see
       * getRootHtmlLang()). This subtree IS request-rendered and knows the
       * real locale, so correct it synchronously as the browser parses the
       * stream — before any content below is parsed, before hydration, and
       * ahead of anything assistive tech would read. HtmlLangSync below stays
       * as the client-side soft-navigation fallback. */}
      <script
        // Non-user-derived: toHtmlLang() maps to a 6-value allowlist.
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang=${JSON.stringify(htmlLang)};`,
        }}
      />
    <SiteChrome
      siteName={common.site.name}
      navigation={navigation}
      brandLogo={brandLogo}
      footerDecorImage={footerDecorImage}
      countryFeatures={countryFeatures}
      countryFooters={countryFooters}
      countryTrust={activeTrust}
      initialLastCountry={initialLastCountry}
      countries={countriesMerged}
      currentLocale={currentLocale}
      parsed={parsed}
      isGatewayHome={isGatewayHome}
    >
      <HtmlLangSync lang={htmlLang} />
      <JsonLd data={[organizationJsonLd(organizationSameAs), websiteJsonLd()]} />
      {children}
    </SiteChrome>
    </>
  );
}

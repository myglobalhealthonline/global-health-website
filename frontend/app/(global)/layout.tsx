import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { RootDocument } from "@/app/_components/RootDocument";
import { PublicAuthProvider } from "@/components/layout/PublicAuthContext";
import { CartProvider } from "@/components/cart/CartContext";
import { MetaPixel } from "@/components/compliance/MetaPixel";
import { GoogleAnalytics } from "@/components/compliance/GoogleAnalytics";
import { MicrosoftClarity } from "@/components/compliance/MicrosoftClarity";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { toHtmlLang } from "@/lib/i18n/html-lang";
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
import { getSelectedLocale } from "@/lib/i18n/selected-locale";
import type { CountryCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { parseSitePath } from "@/lib/routing/path-rewrites";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";
import { rootMetadata } from "@/lib/seo/root-metadata";

/**
 * ROOT layout (owns `<html>`/`<body>`) for the public pages with NO
 * country/lang URL segment: the gateway home, /about, /blog, /cart,
 * /checkout, /contact, /faq, /patient-upload, /privacy, /reviews, /terms,
 * /verify, /brazil, /card-verify. These genuinely have no route param to
 * derive country/locale from, so — unlike the `[country]/[lang]` root — this
 * one reads headers()/cookies() to guess a "last known country" for
 * header/footer IA. That keeps this subtree dynamic, which is fine: it's not
 * the SEO-critical bulk of the site, and being dynamic is precisely why it
 * can emit the resolved locale straight into `<html lang>` with no inline
 * correction script.
 */
export const metadata = rootMetadata;

export default async function GlobalRootLayout({ children }: { children: ReactNode }) {
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

  // The visitor's own language (signed-in preference > cookie/header >
  // Accept-Language > country default). Resolved up front so it also selects
  // the footer/trust translation and the nav copy below, instead of only
  // driving the header's language switcher after the fact.
  const currentLocale = await getSelectedLocale(runtimeCountryConfig?.defaultLocale);

  // runtimeCountry is known here, so the per-country footer fetch can run
  // in the same parallel batch instead of as an extra serial round-trip
  // after it (one less hop on every global page's TTFB).
  const [{ common, navigation }, assets, activeFooter, activeTrust] =
    await Promise.all([
      // Same locale the rest of this layout renders in — passing the raw
      // header/cookie again would let a stale gh_locale give the nav a
      // different language from the page around it.
      getSiteContext({
        explicitCountryCode: runtimeCountry,
        explicitLocale: currentLocale,
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

  return (
    <RootDocument lang={toHtmlLang(currentLocale)}>
      <PublicAuthProvider>
        <CartProvider>
          <MetaPixel />
          <GoogleAnalytics />
          <MicrosoftClarity />
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
            <JsonLd data={[organizationJsonLd(organizationSameAs), websiteJsonLd()]} />
            {children}
          </SiteChrome>
        </CartProvider>
      </PublicAuthProvider>
    </RootDocument>
  );
}

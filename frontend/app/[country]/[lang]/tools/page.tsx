import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { hreflangRegion, ogLocales } from "@/lib/seo/hreflang";
import { isToolMarket, toolHreflangAlternates } from "@/lib/tools/markets";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { ToolsHubPage } from "@/lib/content/tool-page";
import { fillPlaceholders, getToolsCopy } from "@/lib/tools/registry";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * `/{country}/{lang}/tools` — the calculators index.
 *
 * Same contract as the tool pages themselves: code-resident copy, route params
 * only, no cookies()/headers(). See `lib/content/tool-page.tsx` for why the hub
 * exists at all (it is what keeps the tools from being orphaned URLs).
 */
export const revalidate = 3600;

type Params = { country: string; lang: string };

function resolve(country: string, lang: string) {
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return null;
  const config = getCountryByCode(code);
  if (!config) return null;
  // Same gate as the tool routes, so the hub can never exist where the tools do
  // not (or the other way round).
  if (!isToolMarket(code, lang)) return null;
  const locale = lang.toLowerCase() as LocaleCode;

  return {
    code,
    config,
    locale,
    hub: getToolsCopy(locale).hub,
    countryLabel: getCommonLocale(locale).countryNames?.[code] ?? config.name,
    formatLocale: `${locale}-${hreflangRegion(code)}`,
  };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country, lang } = await params;
  const resolved = resolve(country, lang);
  if (!resolved) return { robots: { index: false, follow: false } };

  return buildPublicMetadata({
    path: `/${country}/${lang}/tools`,
    title: fillPlaceholders(resolved.hub.metaTitle, { country: resolved.countryLabel }),
    description: resolved.hub.metaDescription,
    kind: "page",
    subtitle: resolved.countryLabel,
    imageAlt: resolved.hub.navLabel,
    locale: ogLocales(resolved.config, lang).locale,
    // ONE cross-market cluster, exactly as the tool pages do — the index is the
    // same page translated per market, not six unrelated pages.
    languages: toolHreflangAlternates("/tools"),
  });
}

export default async function CountryToolsHubPage({ params }: { params: Promise<Params> }) {
  const { country, lang } = await params;
  const resolved = resolve(country, lang);
  if (!resolved) notFound();

  return (
    <ToolsHubPage
      ctx={{
        country,
        code: resolved.code,
        lang: resolved.locale,
        countryLabel: resolved.countryLabel,
        formatLocale: resolved.formatLocale,
      }}
    />
  );
}

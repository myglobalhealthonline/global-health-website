import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { hreflangRegion, ogLocales } from "@/lib/seo/hreflang";
import { isToolMarket, toolHreflangAlternates } from "@/lib/tools/markets";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { ToolPage } from "@/lib/content/tool-page";
import { getBmiServiceSuggestions } from "@/lib/tools/service-suggestions";
import { applyMarketToolCopy } from "@/lib/tools/market-copy";
import { TOOL_SLUGS, fillPlaceholders, getToolCopy, getToolMeta } from "@/lib/tools/registry";
import type { LocaleCode } from "@/lib/i18n/types";

/** Code-resident copy, route params only — no cookies()/headers() anywhere. */
export const revalidate = 3600;

type Params = { country: string; lang: string; slug: string };

export function generateStaticParams() {
  return TOOL_SLUGS.map((slug) => ({ slug }));
}

function resolve(country: string, lang: string, slug: string) {
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return null;
  const config = getCountryByCode(code);
  if (!config) return null;
  // The market must actually serve tools in this locale. The layout enforces
  // the locale rule too, but metadata runs independently of it, and the tool
  // set is gated in one place (`isToolMarket`) so route, sitemap and footer
  // can never disagree about which URLs exist.
  if (!isToolMarket(code, lang)) return null;
  const locale = lang.toLowerCase() as LocaleCode;
  const meta = getToolMeta(slug);
  const languageCopy = getToolCopy(locale, slug);
  if (!meta || !languageCopy) return null;
  // Same market override the renderer applies, so <title>/description match
  // the page body (Brazilian Portuguese on /brazil/pt).
  const copy = applyMarketToolCopy(code, locale, languageCopy);

  return {
    code,
    config,
    locale,
    copy,
    // Market name in the page's own language ("Brasil", "Česko").
    countryLabel: getCommonLocale(locale).countryNames?.[code] ?? config.name,
    formatLocale: `${locale}-${hreflangRegion(code)}`,
  };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country, lang, slug } = await params;
  const resolved = resolve(country, lang, slug);
  if (!resolved) return { robots: { index: false, follow: false } };

  return buildPublicMetadata({
    path: `/${country}/${lang}/tools/${slug}`,
    // "BMI Calculator Ireland", "Calculadora de IMC Brasil" — the market token
    // is what the head keyword (`bmi calculator ireland`) actually needs.
    title: fillPlaceholders(resolved.copy.metaTitle, { country: resolved.countryLabel }),
    description: resolved.copy.metaDescription,
    kind: "page",
    subtitle: resolved.countryLabel,
    imageAlt: resolved.copy.cardTitle,
    locale: ogLocales(resolved.config, lang).locale,
    // ONE cluster across every market, not this country's locales — see
    // `lib/tools/markets.ts`. This is what routes a Brazilian searcher to the
    // Brazilian page instead of letting 34 near-duplicates compete.
    languages: toolHreflangAlternates(`/tools/${slug}`),
  });
}

export default async function CountryToolPage({ params }: { params: Promise<Params> }) {
  const { country, lang, slug } = await params;
  const resolved = resolve(country, lang, slug);
  if (!resolved) notFound();

  // This market's own weight / nutrition / GP services, read from the live
  // catalogue so the links stay right when an admin renames or adds one.
  const suggestions = await getBmiServiceSuggestions({
    code: resolved.code,
    config: resolved.config,
    country,
    lang,
    locale: resolved.locale,
  });

  return (
    <ToolPage
      slug={slug}
      suggestions={suggestions}
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

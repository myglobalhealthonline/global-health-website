import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderBlogIndexPage } from "@/lib/content/blog-index-page";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { SITE_NAME } from "@/lib/constants";

type Params = { country: string; lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? await getPublicCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const common = loadLocaleBundle(lang as LocaleCode).common;
  const blog = common.blogPage;
  // The country name must come from the locale bundle, not `config.name` —
  // that field is English-only (data/countries.ts), so a Spanish hub read
  // "Guías de salud … para Spain".
  const countryName = common.countryNames?.[code.toLowerCase() as keyof typeof common.countryNames] ?? config.name;
  const heroTitle = `${blog.heroTitleLead ?? blog.heroWatermark ?? "Blog"} ${blog.heroTitleAccent ?? ""}`
    .trim()
    .replace(/\.$/, "");
  const title = (blog.heroTitleCountryTemplate ?? "{title} in {country}")
    .replace("{title}", heroTitle)
    .replace("{country}", countryName);
  const description =
    blog.heroLedeCountryTemplate?.replace("{country}", countryName) ??
    blog.heroLede ??
    "Evidence-based health guides written and reviewed by our medical team.";
  return buildPublicMetadata({
    path: `/${country}/${lang}/blog`,
    title,
    description,
    locale: ogLocales(config, lang).locale,
    kind: "article",
    subtitle: config.name,
    imageAlt: `${title} — ${config.name}`,
    languages: hreflangAlternates(config, "/blog"),
  });
}
export default async function CountryLangBlogIndexPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { country, lang } = await params;
  if (!countryCodeFromSlug(country)) notFound();
  if (!isSupportedLocale(lang)) notFound();
  const { page } = await searchParams;
  return renderBlogIndexPage({ countrySlug: country, lang, page: Number(page) || 1 });
}

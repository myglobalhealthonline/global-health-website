import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderBlogIndexPage } from "@/lib/content/blog-index-page";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getPublicCountryByCode } from "@/lib/content/get-public-countries";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { ogLocales } from "@/lib/seo/hreflang";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { SITE_NAME } from "@/lib/constants";

/** Page 2+ of a country blog index. Path-based rather than `?page=`: reading
 *  searchParams is a Dynamic API and would opt this route out of static
 *  generation, which blog-index-page.tsx deliberately protects. Page 1 lives
 *  at `/{country}/{lang}/blog` and is not reachable here. */
type Params = { country: string; lang: string; n: string };

function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 2 ? n : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { country, lang, n } = await params;
  const page = parsePage(n);
  const code = countryCodeFromSlug(country);
  const config = code ? await getPublicCountryByCode(code) : null;
  if (!page || !code || !config || !isSupportedLocale(lang)) return { title: SITE_NAME };

  const common = loadLocaleBundle(lang as LocaleCode).common;
  const blog = common.blogPage;
  const countryName =
    common.countryNames?.[code.toLowerCase() as keyof typeof common.countryNames] ?? config.name;
  const heroTitle = `${blog.heroTitleLead ?? blog.heroWatermark ?? "Blog"} ${blog.heroTitleAccent ?? ""}`
    .trim()
    .replace(/\.$/, "");
  const title = (blog.heroTitleCountryTemplate ?? "{title} in {country}")
    .replace("{title}", heroTitle)
    .replace("{country}", countryName);
  return buildPublicMetadata({
    path: `/${country}/${lang}/blog/page/${page}`,
    title: `${title} — ${page}`,
    description:
      blog.heroLedeCountryTemplate?.replace("{country}", countryName) ??
      blog.heroLede ??
      "Evidence-based health guides written and reviewed by our medical team.",
    locale: ogLocales(config, lang).locale,
    kind: "article",
    subtitle: config.name,
    imageAlt: `${title} — ${config.name}`,
    // Deeper index pages carry no unique content; only page 1 is submitted.
    noindex: true,
  });
}

export default async function CountryLangBlogIndexPagedPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang, n } = await params;
  const page = parsePage(n);
  if (!page) notFound();
  if (!countryCodeFromSlug(country)) notFound();
  if (!isSupportedLocale(lang)) notFound();
  return renderBlogIndexPage({ countrySlug: country, lang, page });
}

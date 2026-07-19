import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCountryByCode } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { getCountryLandingPage } from "@/lib/content/get-country-collections";
import { scopeBlogHtml } from "@/lib/content/scope-blog-html";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { hreflangAlternates, ogLocales } from "@/lib/seo/hreflang";
import { SITE_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = { country: string; lang: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang, slug } = await params;
  const code = countryCodeFromSlug(country);
  if (!code || !isSupportedLocale(lang)) return { title: SITE_NAME };
  const config = getCountryByCode(code);
  const page = await getCountryLandingPage(code, slug, lang);
  if (!page) return { title: SITE_NAME };
  const title = page.seoTitle ?? page.title;
  const description = page.seoDescription ?? `Learn about ${page.title} in ${config?.name ?? country}.`;
  return buildPublicMetadata({
    path: `/${country}/${lang}/health/${slug}`,
    title,
    description,
    type: "article",
    kind: "article",
    subtitle: config?.name,
    imageAlt: `${page.title} — ${config?.name ?? country}`,
    locale: config ? ogLocales(config, lang).locale : undefined,
    languages: config ? hreflangAlternates(config, `/health/${slug}`) : undefined,
  });
}

/**
 * SEO landing page (condition / audience marketing page). Indexed via the
 * sitemap; intentionally NOT in the main nav or service-listing pages
 * (internal-linking spec, Rule 6). Linked only from related service pages
 * and blog posts.
 */
export default async function CountryLandingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang, slug } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) notFound();

  const page = await getCountryLandingPage(code, slug, lang);
  if (!page) notFound();

  const bodyHtml = page.bodyHtml ? scopeBlogHtml(page.bodyHtml) : null;

  return (
    <article className="mx-auto max-w-[var(--container-width)] px-5 py-[clamp(48px,7vw,96px)] md:px-10">
      <h1 className="text-[clamp(2rem,4vw,3rem)] font-extrabold tracking-[-0.02em] text-[var(--color-text-primary)]">
        {page.title}
      </h1>
      {bodyHtml ? (
        <div
          className="gh-article-body mt-8 max-w-[76ch]"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      ) : null}
    </article>
  );
}

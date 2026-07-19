import { notFound } from "next/navigation";
import { buildBlogPostMetadata, renderBlogPostPage } from "@/lib/content/blog-post-page";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";

type Params = { country: string; lang: string; slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const p = await params;
  const code = countryCodeFromSlug(p.country);
  if (!code || !isSupportedLocale(p.lang)) return { title: "Global Health" };
  return buildBlogPostMetadata(
    Promise.resolve({ slug: p.slug, countrySlug: p.country, lang: p.lang }),
  );
}

export default async function CountryLangBlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang, slug } = await params;
  if (!countryCodeFromSlug(country)) notFound();
  if (!isSupportedLocale(lang)) notFound();
  return renderBlogPostPage(Promise.resolve({ slug, countrySlug: country, lang }));
}

import { notFound } from "next/navigation";
import { renderBlogIndexPage } from "@/lib/content/blog-index-page";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { isSupportedLocale } from "@/lib/content/get-public-page";

type Params = { country: string; lang: string };

export default async function CountryLangBlogIndexPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang } = await params;
  if (!countryCodeFromSlug(country)) notFound();
  if (!isSupportedLocale(lang)) notFound();
  return renderBlogIndexPage({ countrySlug: country, lang });
}

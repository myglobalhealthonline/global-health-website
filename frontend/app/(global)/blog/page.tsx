import type { Metadata } from "next";
import { renderBlogIndexPage } from "@/lib/content/blog-index-page";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale();
  const blog = getCommonLocale(locale).blogPage;
  const title = `${blog.heroTitleLead ?? "Health guides"} ${blog.heroTitleAccent ?? "and articles"}`;

  return buildPublicMetadata({
    path: "/blog",
    title,
    description: blog.heroLede ?? "Evidence-based health guides written and reviewed by the Global Health medical team.",
    locale,
    kind: "article",
    subtitle: blog.heroCountryLabel ?? "Global Health blog",
    sourceImage: "/images/stock/blog.webp",
    imageAlt: `${title} - Global Health medical articles`,
  });
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  return renderBlogIndexPage({ page: Number(page) || 1 });
}

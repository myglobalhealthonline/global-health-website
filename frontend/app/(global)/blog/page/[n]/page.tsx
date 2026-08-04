import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderBlogIndexPage } from "@/lib/content/blog-index-page";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

/** Page 2+ of the bare blog hub. Path-based rather than `?page=` so the
 *  route stays statically renderable — reading searchParams is a Dynamic API
 *  and would opt the whole index out of static generation. Page 1 lives at
 *  `/blog` itself and is never reachable here (it redirects via notFound). */
type Params = { n: string };

function parsePage(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  // Page 1 has a canonical home at /blog; /blog/page/1 would duplicate it.
  return n >= 2 ? n : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { n } = await params;
  const page = parsePage(n);
  if (!page) return {};
  const locale = await getPageLocale();
  const blog = getCommonLocale(locale).blogPage;
  const title = `${blog.heroTitleLead ?? "Health guides"} ${blog.heroTitleAccent ?? "and articles"}`;
  return buildPublicMetadata({
    path: `/blog/page/${page}`,
    title: `${title} — ${page}`,
    description:
      blog.heroLede ?? "Evidence-based health guides written and reviewed by the Global Health medical team.",
    locale,
    kind: "article",
    subtitle: blog.heroCountryLabel ?? "Global Health blog",
    sourceImage: "/images/stock/blog.webp",
    imageAlt: `${title} - Global Health medical articles`,
    // Deeper index pages carry no unique content of their own.
    noindex: true,
  });
}

export default async function BlogIndexPagedPage({ params }: { params: Promise<Params> }) {
  const { n } = await params;
  const page = parsePage(n);
  if (!page) notFound();
  return renderBlogIndexPage({ page });
}

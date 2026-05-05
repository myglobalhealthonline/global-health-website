import type { Metadata } from "next";
import { routeInventory } from "@/data/routes";
import { PageShell } from "@/components/layout/PageShell";
import { notFound } from "next/navigation";

type Params = { slug: string };
const known = routeInventory.blogPosts.map((p) => p.replace("/post/", ""));

export const metadata: Metadata = {
  title: "Blog Article",
  description: "Blog article placeholder.",
};

export function generateStaticParams() {
  return known.map((slug) => ({ slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!known.includes(slug)) notFound();
  return (
    <PageShell
      title={`Blog Article: ${slug}`}
      message="TODO: Add final blog article content and SEO metadata."
      ctaHref="/blog"
      ctaLabel="Back to Blog"
    />
  );
}


import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticleTemplate } from "@/components/templates/BlogArticleTemplate";
import { routeInventory } from "@/data/routes";

type Params = { slug: string };
const known = routeInventory.blogPosts.map((p) => p.replace("/post/", ""));

export const metadata: Metadata = {
  title: "Blog Article",
  description: "Blog article template.",
};

export function generateStaticParams() {
  return known.map((slug) => ({ slug }));
}

function slugToTitle(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!known.includes(slug)) notFound();

  return (
    <BlogArticleTemplate
      title={slugToTitle(slug)}
      lead="TODO: Replace with approved editorial intro from CMS/backend content source."
      body={[
        "TODO: Replace this paragraph with migrated blog content.",
        "This template is intentionally generic until audited editorial content is integrated.",
      ]}
    />
  );
}

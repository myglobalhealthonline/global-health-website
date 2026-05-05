import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticleTemplate } from "@/components/templates/BlogArticleTemplate";
import { routeInventory } from "@/data/routes";

type Params = { slug: string };
const known = routeInventory.blogPosts.map((p) => p.replace("/post/", ""));

export const metadata: Metadata = {
  title: "Blog Article",
  description: "Patient-focused blog article.",
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
      lead="This article explains the topic in clear, patient-friendly language and helps you decide practical next steps."
      body={[
        "Online care articles in this section are designed to support decision-making before booking a consultation.",
        "For personal medical advice, use the booking flow so a clinician can review your context directly and recommend the appropriate pathway.",
      ]}
    />
  );
}

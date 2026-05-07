import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticleTemplate } from "@/components/templates/BlogArticleTemplate";
import { blogPosts } from "@/data/blog-posts";

type Params = { slug: string };

export const metadata: Metadata = {
  title: "Blog Article",
  description: "Health article from Global Health.",
  robots: {
    index: false,
    follow: true,
  },
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) notFound();

  return (
    <BlogArticleTemplate
      title={post.title}
      lead={post.excerpt}
      body={post.body}
      author={post.author}
      reviewer={post.reviewer}
      category={post.category}
      updatedAt={post.updatedAt}
    />
  );
}

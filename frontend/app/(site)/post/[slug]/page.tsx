import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticleTemplate } from "@/components/templates/BlogArticleTemplate";
import { blogPosts } from "@/data/blog-posts";
import { validateAdminBlogPayload } from "@/lib/content/publication-validation";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post) {
    return { title: "Blog Article", robots: { index: false, follow: true } };
  }
  const validation = validateAdminBlogPayload({
    title: post.title,
    excerpt: post.excerpt,
    body: post.body.join("\n\n"),
    seoTitle: post.title,
    seoDescription: post.excerpt,
    authorDisplayName: post.author,
    updatedAt: post.updatedAt,
    category: post.category,
    status: "PUBLISHED",
  });
  return {
    title: post.title,
    description: post.excerpt,
    alternates: {
      canonical: `/post/${post.slug}`,
    },
    robots: validation.shouldNoindex ? { index: false, follow: true } : undefined,
  };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = blogPosts.find((item) => item.slug === slug);
  if (!post || !post.reviewer.trim()) notFound();

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

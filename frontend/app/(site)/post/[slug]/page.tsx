import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogArticleTemplate } from "@/components/templates/BlogArticleTemplate";
import {
  getApprovedPublicBlogPostBySlug,
  splitBlogBodyToParagraphs,
} from "@/lib/content/get-public-blog-posts";
import { sanitizeBlogHtml } from "@/lib/content/sanitize-blog-html";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getApprovedPublicBlogPostBySlug(slug);
  if (!post) {
    return { title: "Blog Article", robots: { index: false, follow: true } };
  }
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    alternates: {
      canonical: `/post/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getApprovedPublicBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <BlogArticleTemplate
      title={post.title}
      lead={post.excerpt}
      bodyHtml={post.contentFormat === "html" ? sanitizeBlogHtml(post.body) : null}
      bodyParagraphs={post.contentFormat === "html" ? [] : splitBlogBodyToParagraphs(post.body)}
      author={post.authorDisplayName}
      reviewer={post.reviewerDisplayName}
      category={post.category}
      updatedAt={new Date(post.lastReviewedAt).toISOString().slice(0, 10)}
    />
  );
}

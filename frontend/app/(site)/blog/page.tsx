import type { Metadata } from "next";
import { BlogIndexTemplate } from "@/components/templates/BlogIndexTemplate";
import { getApprovedPublicBlogPosts } from "@/lib/content/get-public-blog-posts";

export async function generateMetadata(): Promise<Metadata> {
  const posts = await getApprovedPublicBlogPosts();
  return {
    title: "Blog",
    description: "Health education articles from Global Health.",
    robots: posts.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function Page() {
  const posts = await getApprovedPublicBlogPosts();
  return (
    <BlogIndexTemplate
      title="Blog"
      description="Editorial health education from Global Health. Articles appear here only after author and medical-review details are available."
      posts={posts.map((post) => ({
        title: post.title,
        excerpt: post.excerpt,
        href: `/post/${post.slug}`,
        coverImageSrc: post.coverImageSrc,
        coverImageAlt: post.coverImageAlt,
      }))}
    />
  );
}

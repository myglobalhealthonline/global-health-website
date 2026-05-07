import type { Metadata } from "next";
import { BlogIndexTemplate } from "@/components/templates/BlogIndexTemplate";
import { blogPosts } from "@/data/blog-posts";

export const metadata: Metadata = {
  title: "Blog",
  description: "Health education articles from Global Health.",
};

export default function Page() {
  return (
    <BlogIndexTemplate
      title="Blog"
      description="Editorial health education from Global Health. Articles appear here only after author and medical-review details are available."
      posts={blogPosts.map((post) => ({
        title: post.title,
        excerpt: post.excerpt,
        href: `/post/${post.slug}`,
      }))}
    />
  );
}

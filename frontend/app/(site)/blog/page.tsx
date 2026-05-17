import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { blogPosts } from "@/data/blog-posts";
import { BlogCard } from "@/components/cards/BlogCard";

export const metadata: Metadata = {
  title: `Health Blog | ${SITE_NAME}`,
  description:
    "Guides, explainers, and health education from the Global Health medical team — covering telemedicine, prescriptions, lab tests, and more.",
};

export default function BlogIndexPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Health guides &amp; articles
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-500">
          Evidence-based health guides written and reviewed by our medical team.
          No ads, no fluff — just clear information to help you make informed
          decisions about your care.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {blogPosts.map((post) => (
          <BlogCard
            key={post.slug}
            title={post.title}
            excerpt={post.excerpt}
            href={`/blog/${post.slug}`}
          />
        ))}
      </div>
    </main>
  );
}

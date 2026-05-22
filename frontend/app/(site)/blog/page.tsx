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
  // Sort newest-first by publishedAt, then promote the freshest post
  // into the 2x2 featured slot of .gh-card-grid--featured. Falls back
  // to a flat grid when there aren't enough posts to justify a hero
  // (4 minimum — the featured tile spans two rows so we need at
  // least three flat cards beneath it to avoid an empty grid row).
  const ordered = [...blogPosts].sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : -1,
  );
  const useFeatured = ordered.length >= 4;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 gh-section-tight">
      <div className="mb-10">
        <p className="gh-eyebrow text-[var(--color-brand-primary)]">
          Global Health · Blog
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[var(--color-text-primary)] sm:text-4xl">
          Health guides &amp; articles
        </h1>
        <p className="mt-3 max-w-[65ch] text-base text-[var(--color-text-muted)]">
          Evidence-based health guides written and reviewed by our medical team.
          No ads, no fluff — just clear information to help you make informed
          decisions about your care.
        </p>
      </div>

      <div
        className={
          useFeatured
            ? "gh-card-grid gh-card-grid--featured"
            : "gh-card-grid"
        }
      >
        {ordered.map((post, i) => (
          <BlogCard
            key={post.slug}
            title={post.title}
            excerpt={post.excerpt}
            href={`/blog/${post.slug}`}
            category={post.category}
            publishedAt={post.publishedAt}
            featured={useFeatured && i === 0}
          />
        ))}
      </div>
    </main>
  );
}

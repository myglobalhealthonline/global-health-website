import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { listBlogPosts } from "@/lib/content/get-public-blog";
import { BlogCard } from "@/components/cards/BlogCard";
import { GH2CompactHero } from "@/components/sections/GH2PagePrimitives";

export const metadata: Metadata = {
  title: `Health Blog | ${SITE_NAME}`,
  description:
    "Guides, explainers, and health education from the Global Health medical team covering telemedicine, online consultations, lab tests, and more.",
};

export default async function BlogIndexPage() {
  const ordered = await listBlogPosts();

  return (
    <>
      <GH2CompactHero
        eyebrow="Global Health · Blog"
        title="Health guides"
        accent="articles."
        watermark="Blog"
        body="Evidence-based guides written and reviewed by our medical team. No ads, no fluff."
        meta={<p className="gh2-index">{ordered.length} {ordered.length === 1 ? "article" : "articles"} available</p>}
      />

      <section
        style={{
          background: "var(--color-background-soft)",
          borderTop: "1px solid rgba(29,75,54,0.10)",
          padding: "clamp(64px,8vw,120px) 0",
        }}
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          {ordered.length === 0 ? (
            <div className="mx-auto max-w-[520px] text-center">
              <p aria-hidden className="gh2-index text-[4rem] leading-none text-[rgba(29,75,54,0.16)]">
                00
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                No articles published yet
              </h2>
              <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-text-muted)]">
                Check back soon for medical guides and service explainers.
              </p>
              <Link href="/" className="mt-6 inline-flex rounded-full border border-[rgba(29,75,54,0.25)] px-6 py-4 text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[rgba(29,75,54,0.06)]">
                Back to country selection
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 [&>*:first-child]:lg:col-span-2">
              {ordered.map((post) => (
                <BlogCard
                  key={post.slug}
                  title={post.title}
                  excerpt={post.excerpt}
                  href={`/blog/${post.slug}`}
                  category={post.category}
                  publishedAt={post.publishedAt}
                  coverImageSrc={post.coverImageSrc}
                  coverImageAlt={post.coverImageAlt}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

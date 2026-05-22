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
    <>
      {/* Dark editorial header */}
      <section
        className="relative isolate overflow-hidden"
        style={{
          background: "var(--color-background-dark)",
          padding: "clamp(72px,10vw,140px) 0 clamp(56px,7vw,96px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 900px 500px at 80% -10%, rgba(176,241,34,0.12), transparent 55%)",
          }}
        />
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--color-brand-accent)" }}
          >
            Global Health · Blog
          </p>
          <h1
            className="mt-5 font-extrabold tracking-[-0.04em] leading-[0.97]"
            style={{
              fontSize: "clamp(3rem,7vw+0.5rem,7rem)",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            Health guides{" "}
            <em style={{ fontStyle: "italic", color: "var(--color-brand-accent)" }}>
              &amp; articles.
            </em>
          </h1>
          <p
            className="mt-7 max-w-[52ch] text-[length:var(--text-body-lg)] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.50)" }}
          >
            Evidence-based guides written and reviewed by our medical team.
            No ads, no fluff.
          </p>
        </div>
      </section>

      {/* Light card grid */}
      <section
        style={{
          background: "var(--color-background-soft)",
          padding: "clamp(64px,8vw,120px) 0",
        }}
      >
        <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
          <div className={useFeatured ? "gh-card-grid gh-card-grid--featured" : "gh-card-grid"}>
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
        </div>
      </section>
    </>
  );
}

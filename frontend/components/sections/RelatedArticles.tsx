import Link from "next/link";
import { SectionSeam } from "@/components/ui/SectionSeam";
import type { RelatedBlogLink } from "@/lib/content/get-public-blog";

/**
 * Link-back from a commercial page into the blog articles written for it.
 * Same markup as the health-page "related topics" list — the only new thing
 * here is where the links come from. Renders nothing when the market has no
 * published article yet, so it is inert until the client publishes.
 */
export function RelatedArticles({
  title,
  posts,
  basePath,
}: {
  title: string;
  posts: RelatedBlogLink[];
  /** `/{country}/{lang}` — the blog slug is appended per post. */
  basePath: string;
}) {
  if (posts.length === 0) return null;
  return (
    <section className="gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel gh-inline-clamp-section-tight">
      <SectionSeam theme="light" />
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <h2 className="text-[clamp(1.2rem,2vw,1.6rem)] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
          {title}
        </h2>
        <ul className="mt-4 space-y-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`${basePath}/blog/${post.slug}`}
                className="text-[15px] font-medium text-[var(--color-brand-accent)] underline underline-offset-2"
              >
                {post.title}
              </Link>
              <p className="mt-1 max-w-[70ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                {post.excerpt}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

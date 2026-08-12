import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";

type BlogCardProps = {
  title: string;
  excerpt: string;
  href: string;
  /** Category badge (e.g. "Telemedicine", "Patient Guide"). */
  category?: string;
  /** ISO date string; rendered as a human-readable month/year. */
  publishedAt?: string;
  /** Optional cover thumbnail (absolute URL or resolvable path). */
  coverImageSrc?: string | null;
  coverImageAlt?: string | null;
  /** Kept for API compatibility — long cards no longer use a featured slot. */
  featured?: boolean;
  categoryFallback?: string;
  readArticleLabel?: string;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return DATE_FORMATTER.format(date);
}

/**
 * Long (horizontal) article card: cover image on the left, content on the
 * right; stacks to image-on-top on mobile. Designed to sit in a single
 * vertical column on the blog index.
 */
export function BlogCard({
  title,
  excerpt,
  href,
  category,
  publishedAt,
  coverImageSrc,
  coverImageAlt,
  categoryFallback = "Health guide",
  readArticleLabel = "Read article",
}: BlogCardProps) {
  const dateLabel = formatDate(publishedAt);
  return (
    <article className="group gh2-glass-forest gh2-glass-hover gh2-dark-content relative flex h-full flex-col overflow-hidden p-0 focus-within:ring-2 focus-within:ring-[color:rgba(176,241,34,0.55)] sm:flex-row">
      {coverImageSrc ? (
        <div className="relative h-52 w-full shrink-0 overflow-hidden sm:h-auto sm:min-h-[260px] sm:w-[38%] sm:max-w-[380px]">
          <Image
            src={coverImageSrc}
            alt={coverImageAlt ?? ""}
            fill
            sizes="(min-width:640px) 380px, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            unoptimized={isUnoptimizedImageSrc(coverImageSrc)}
          />
          {/* Scrim: melts the photo into the glass instead of butting a hard
              edge against it — vertical on mobile (stacked), horizontal on
              desktop (side-by-side). */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,34,26,0.85),rgba(6,34,26,0)_58%)] sm:bg-[linear-gradient(to_right,rgba(6,34,26,0.10),rgba(6,34,26,0.92))]"
          />
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 hidden w-px bg-[linear-gradient(to_bottom,transparent,rgba(176,241,34,0.28),transparent)] sm:block"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-6 sm:p-8 lg:p-9">
        <div className="flex items-center gap-3 text-[var(--text-eyebrow)]">
          <span className="gh-eyebrow rounded-full border border-[rgba(176,241,34,0.22)] bg-[rgba(176,241,34,0.10)] px-2.5 py-1 text-[var(--color-brand-accent)]">
            {category ?? categoryFallback}
          </span>
          {dateLabel ? (
            <time dateTime={publishedAt} className="text-white/50">
              {dateLabel}
            </time>
          ) : null}
        </div>

        {/* h2, not h3 — the blog index renders this grid directly under the
            page <h1> with no intervening section heading, so h3 would skip a
            level. Single call site (blog-index-page.tsx), hence no prop. */}
        <h2 className="mt-3.5 text-xl font-extrabold leading-snug tracking-[-0.015em] text-white sm:text-2xl lg:text-[1.7rem]">
          {/* Stretched link — the whole card is the hit area, so the visible
              "Read article" below stays a span (one link per card, no
              duplicate destination for screen readers). */}
          <Link
            href={href}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:text-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)]"
          >
            {title}
          </Link>
        </h2>

        <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65 sm:text-base">
          {excerpt}
        </p>

        <span className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[rgba(176,241,34,0.28)] bg-[rgba(176,241,34,0.08)] px-4 text-sm font-extrabold text-[var(--color-brand-accent)] transition-[background-color,border-color,color] group-hover:border-[var(--color-brand-accent)] group-hover:bg-[var(--color-brand-accent)] group-hover:text-[#0B2A20]">
          {readArticleLabel}
          <ArrowRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            strokeWidth={2}
            aria-hidden
          />
        </span>
      </div>
    </article>
  );
}

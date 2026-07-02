import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
}: BlogCardProps) {
  const dateLabel = formatDate(publishedAt);
  return (
    <article className="gh-card gh-card-hover flex h-full flex-col overflow-hidden p-0 sm:flex-row">
      {coverImageSrc ? (
        <Link
          href={href}
          aria-hidden
          tabIndex={-1}
          className="block shrink-0 sm:w-[38%] sm:max-w-[360px]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageSrc}
            alt={coverImageAlt ?? ""}
            className="block h-48 w-full object-cover sm:h-full sm:min-h-[220px]"
          />
        </Link>
      ) : null}

      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex items-center gap-3 text-[var(--text-eyebrow)]">
          <span className="gh-eyebrow text-[var(--color-brand-primary)]">
            {category ?? "Health guide"}
          </span>
          {dateLabel ? (
            <>
              <span aria-hidden className="text-[var(--color-text-placeholder)]">
                ·
              </span>
              <time dateTime={publishedAt} className="text-[var(--color-text-muted)]">
                {dateLabel}
              </time>
            </>
          ) : null}
        </div>

        <h3 className="mt-3 text-xl font-extrabold tracking-[-0.015em] leading-snug text-[var(--color-text-primary)] sm:text-2xl">
          {title}
        </h3>

        <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
          {excerpt}
        </p>

        <Link
          href={href}
          className="mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[rgba(29,75,54,0.22)] bg-[var(--color-background-soft)] px-4 text-sm font-extrabold text-[var(--color-brand-primary)] transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:rgba(29,75,54,0.35)] motion-reduce:hover:translate-y-0"
        >
          Read article
          <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
        </Link>
      </div>
    </article>
  );
}

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
  /** Promotes this card to the 2x2 featured slot in
   *  .gh-card-grid--featured. Larger headline, longer excerpt, no
   *  layout changes elsewhere — the grid utility handles the span. */
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

export function BlogCard({
  title,
  excerpt,
  href,
  category,
  publishedAt,
  featured = false,
}: BlogCardProps) {
  const dateLabel = formatDate(publishedAt);
  return (
    <article
      className={
        featured
          ? "gh-card gh-card-hover flex h-full flex-col p-8 sm:p-10"
          : "gh-card gh-card-hover flex h-full flex-col p-6"
      }
    >
      <div className="flex items-center gap-3 text-[var(--text-eyebrow)]">
        <span className="gh-eyebrow text-[var(--color-brand-primary)]">
          {category ?? "Health guide"}
        </span>
        {dateLabel ? (
          <>
            <span aria-hidden className="text-[var(--color-text-placeholder)]">
              ·
            </span>
            <time
              dateTime={publishedAt}
              className="text-[var(--color-text-muted)]"
            >
              {dateLabel}
            </time>
          </>
        ) : null}
      </div>
      <h3
        className={
          featured
            ? "mt-4 text-2xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-3xl"
            : "mt-3 text-lg font-bold leading-snug text-[var(--color-text-primary)]"
        }
      >
        {title}
      </h3>
      <p
        className={
          featured
            ? "mt-4 flex-1 text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg"
            : "mt-3 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]"
        }
      >
        {excerpt}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-brand-primary)] transition-colors hover:text-[var(--color-brand-primary-hover)]"
      >
        Read article
        <ArrowRight className="size-4" strokeWidth={1.5} aria-hidden />
      </Link>
    </article>
  );
}

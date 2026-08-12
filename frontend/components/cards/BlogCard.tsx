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
  /**
   * "long" (default) — cover left, copy right; used one-per-row on the index.
   * "stacked" — cover on top, copy below; used in the 3-up related-articles
   * grid at the foot of an article, where a horizontal card would leave the
   * photo too narrow to read.
   */
  orientation?: "long" | "stacked";
  /** Heading level for the card title. The related grid sits under its own
   *  section <h2>, so it needs h3 to avoid skipping a level. */
  headingLevel?: "h2" | "h3";
  /** BCP-47 tag for the date. The article pages render in five languages;
   *  a hardcoded en-GB date reads as untranslated chrome next to them. */
  locale?: string;
  /** Pre-formatted reading time (e.g. "6 min read"), shown next to the date. */
  readingTimeLabel?: string | null;
};

function formatDate(iso: string | undefined, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

/**
 * Article card. Two orientations, one implementation — see `orientation`.
 * Cover image, category, date/reading time, title, excerpt and a read
 * affordance; the whole card is the hit area via a stretched link.
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
  orientation = "long",
  headingLevel = "h2",
  locale = "en-GB",
  readingTimeLabel = null,
}: BlogCardProps) {
  const dateLabel = formatDate(publishedAt, locale);
  const stacked = orientation === "stacked";
  const Heading = headingLevel;
  return (
    <article
      className={`group gh2-glass-forest gh2-glass-hover gh2-dark-content relative flex h-full flex-col overflow-hidden p-0 focus-within:ring-2 focus-within:ring-[color:rgba(176,241,34,0.55)] ${
        stacked ? "" : "sm:flex-row"
      }`}
    >
      {coverImageSrc ? (
        <div
          className={
            stacked
              ? "relative aspect-[16/10] w-full shrink-0 overflow-hidden"
              : "relative h-52 w-full shrink-0 overflow-hidden sm:h-auto sm:min-h-[260px] sm:w-[38%] sm:max-w-[380px]"
          }
        >
          <Image
            src={coverImageSrc}
            alt={coverImageAlt ?? ""}
            fill
            sizes={stacked ? "(min-width:1024px) 380px, (min-width:640px) 50vw, 100vw" : "(min-width:640px) 380px, 100vw"}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            unoptimized={isUnoptimizedImageSrc(coverImageSrc)}
          />
          {/* Scrim: melts the photo into the glass instead of butting a hard
              edge against it — vertical when the copy sits below the photo,
              horizontal when it sits beside it. */}
          <div
            aria-hidden
            className={
              stacked
                ? "absolute inset-0 bg-[linear-gradient(to_top,rgba(6,34,26,0.92),rgba(6,34,26,0)_62%)]"
                : "absolute inset-0 bg-[linear-gradient(to_top,rgba(6,34,26,0.85),rgba(6,34,26,0)_58%)] sm:bg-[linear-gradient(to_right,rgba(6,34,26,0.10),rgba(6,34,26,0.92))]"
            }
          />
          <div
            aria-hidden
            className={
              stacked
                ? "absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(to_right,transparent,rgba(176,241,34,0.28),transparent)]"
                : "absolute inset-y-0 right-0 hidden w-px bg-[linear-gradient(to_bottom,transparent,rgba(176,241,34,0.28),transparent)] sm:block"
            }
          />
        </div>
      ) : null}

      <div className={stacked ? "flex flex-1 flex-col p-6" : "flex flex-1 flex-col p-6 sm:p-8 lg:p-9"}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[var(--text-eyebrow)]">
          {/* Inline colour, not a `text-[…]` utility: globals.css's hand-authored
              `.gh-eyebrow { color: var(--color-brand-primary) }` is UNLAYERED, so
              it outranks every layered Tailwind utility. The pill was rendering
              at the inherited muted white (4.22:1 on the glass) instead of lime. */}
          <span
            className="gh-eyebrow rounded-full border border-[rgba(176,241,34,0.22)] bg-[rgba(176,241,34,0.10)] px-2.5 py-1"
            style={{ color: "var(--color-brand-accent)" }}
          >
            {category ?? categoryFallback}
          </span>
          {dateLabel ? (
            <time dateTime={publishedAt} className="text-white/60">
              {dateLabel}
            </time>
          ) : null}
          {readingTimeLabel ? <span className="text-white/60">{readingTimeLabel}</span> : null}
        </div>

        <Heading
          className={
            stacked
              ? "mt-3 text-[1.0625rem] font-extrabold leading-snug tracking-[-0.015em] text-white sm:text-lg"
              : "mt-3.5 text-xl font-extrabold leading-snug tracking-[-0.015em] text-white sm:text-2xl lg:text-[1.7rem]"
          }
        >
          {/* Stretched link — the whole card is the hit area, so the visible
              "Read article" below stays a span (one link per card, no
              duplicate destination for screen readers). */}
          <Link
            href={href}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:text-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)]"
          >
            {title}
          </Link>
        </Heading>

        <p
          className={
            stacked
              ? "mt-2.5 line-clamp-3 flex-1 text-[13.5px] leading-relaxed text-white/70"
              : "mt-3 flex-1 text-sm leading-relaxed text-white/65 sm:text-base"
          }
        >
          {excerpt}
        </p>

        <span
          className={`inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-[rgba(176,241,34,0.28)] bg-[rgba(176,241,34,0.08)] px-4 text-sm font-extrabold text-[var(--color-brand-accent)] transition-[background-color,border-color,color] group-hover:border-[var(--color-brand-accent)] group-hover:bg-[var(--color-brand-accent)] group-hover:text-[#0B2A20] ${
            stacked ? "mt-5" : "mt-6"
          }`}
        >
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

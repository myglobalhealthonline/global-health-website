"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Tag, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";
import { isBookingWorkflowHref } from "@/lib/routing/book-href";
import { BookCta, BookNowButton } from "@/components/booking/BookNowButton";


type ServiceCardProps = {
  /** Single-CTA mode: whole card links here. Optional when detailHref is set. */
  href?: string;
  title: string;
  description: string;
  duration?: string;
  startingPrice?: string;
  ctaLabel?: string;
  className?: string;
  imageSrc?: string | null;
  /** When true, renders as a dark glass card matching the dark luxury theme. */
  dark?: boolean;
  /** Two-CTA mode: "Learn more" → detailHref, "Book" → bookHref. When both
   *  are set the card surface links to detailHref and a footer renders two
   *  explicit buttons. Falls back to single-CTA `href` mode otherwise. */
  detailHref?: string;
  bookHref?: string;
  bookLabel?: string;
  /** When the card sits in a 2-column featured grid slot, switch to a
   *  horizontal image-left | content-right layout on desktop so the row
   *  stays the same height as its siblings (mirrors ServiceCatalog). */
  featured?: boolean;
};

/** Footer actions for two-CTA mode. Sits above the card-wide overlay link
 *  via z-index so each button's own navigation fires. Buttons mirror the
 *  site-wide CTA pair: lime primary with glow (gh2-btn-lime scale) +
 *  outline secondary that fills on hover. */
function TwoActions({
  detailHref,
  bookHref,
  learnLabel,
  bookLabel,
  title,
  dark,
}: {
  detailHref: string;
  bookHref: string;
  learnLabel: string;
  bookLabel: string;
  title: string;
  dark: boolean;
}) {
  return (
    <div className="relative z-10 mt-6 flex flex-col gap-2 sm:flex-row sm:gap-2.5">
      {/* sr-only suffix (not aria-label): Lighthouse's descriptive-link-text
          SEO audit reads visible/text content only, so an aria-label alone
          still flags "Learn more" as generic. */}
      <Link
        href={detailHref}
        className={cn(
          "inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold tracking-[-0.005em] whitespace-nowrap transition-[background-color,color,border-color] duration-200 focus-visible:outline-none sm:w-auto sm:shrink-0",
          dark
            ? "border border-white/25 bg-white/[0.06] text-white/90 hover:bg-white hover:text-[var(--color-brand-primary)]"
            : "border border-[var(--color-border-strong)] bg-transparent text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:border-[var(--color-brand-primary)] hover:text-white",
        )}
      >
        {learnLabel}
        <span className="sr-only">: {title}</span>
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </Link>
      <BookCta
        href={bookHref}
        className="inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full px-4 text-sm font-extrabold tracking-[-0.005em] transition-[transform,filter,box-shadow,background-color] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0 whitespace-nowrap sm:flex-1"
        style={
          dark
            ? {
                background: "var(--color-brand-accent)",
                color: "#0a1f14",
                boxShadow: "0 8px 12px -2px rgba(176,241,34,0.14)",
              }
            : {
                background: "var(--color-brand-primary)",
                color: "#ffffff",
                boxShadow: "0 6px 18px rgba(29,75,54,0.22)",
              }
        }
      >
        <CalendarDays className="size-4 shrink-0" strokeWidth={1.8} aria-hidden />
        {bookLabel}
        <span className="sr-only">: {title}</span>
      </BookCta>
    </div>
  );
}

export function ServiceCard({
  href,
  title,
  description,
  duration,
  startingPrice,
  ctaLabel,
  className,
  imageSrc,
  dark = false,
  detailHref,
  bookHref,
  bookLabel = "Book",
  featured = false,
}: ServiceCardProps) {
  const twoButton = Boolean(detailHref && bookHref);
  // Card-wide overlay target: detail page in two-CTA mode, else the legacy href.
  const overlayHref = twoButton ? detailHref! : href;
  const learnLabel = ctaLabel ?? "Learn more";

  // Card-wide overlay link — a sibling (not parent) of the footer buttons so
  // there are no nested anchors. In single-CTA mode it is the only link.
  // In single-CTA mode `overlayHref` is the caller's `href` verbatim, which
  // can carry booking-wizard state (e.g. doctor-profile-page.tsx's per-service
  // consultHref) — render a client-side button there instead of a crawlable
  // anchor, same as every other booking CTA.
  const overlay = overlayHref ? (
    isBookingWorkflowHref(overlayHref) ? (
      <BookNowButton
        href={overlayHref}
        ariaLabel={`${learnLabel}: ${title}`}
        className="absolute inset-0 z-[1] rounded-[var(--radius-card)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]"
      />
    ) : (
      <Link
        href={overlayHref}
        aria-label={`${learnLabel}: ${title}`}
        className="absolute inset-0 z-[1] rounded-[var(--radius-card)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]"
        tabIndex={twoButton ? -1 : 0}
      />
    )
  ) : null;

  if (dark) {
    // Image-top card (DoctorCard structure): photo region with price chip
    // overlay, glass body with title/description/chips and CTA footer.
    if (imageSrc) {
      return (
        <article
          className={cn(
            "group relative h-full overflow-hidden gh2-glass-forest gh2-glass-hover",
            featured ? "flex flex-col lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : "flex flex-col",
            "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            className,
          )}
        >
          {overlay}
          {/* Photo */}
          {/* Photo grows to absorb extra row height (aspect ratio = minimum),
              so short-copy cards don't show a dead gap before the CTA. */}
          <div
            className={cn(
              "relative overflow-hidden",
              featured ? "aspect-[16/10] lg:aspect-auto lg:min-h-[280px]" : "flex-1",
            )}
            style={featured ? undefined : { aspectRatio: "16 / 10" }}
          >
            <Image
              src={imageSrc}
              alt={title}
              fill
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
              unoptimized={isUnoptimizedImageSrc(imageSrc)}
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            {/* Bottom fade so the body edge reads clean */}
            <div
              aria-hidden
              className={cn("absolute inset-x-0 bottom-0 h-16", featured && "lg:hidden")}
              style={{ background: "linear-gradient(180deg, transparent 0%, rgba(13,38,30,0.55) 100%)" }}
            />
            {featured ? (
              <div
                aria-hidden
                className="absolute inset-y-0 right-0 hidden w-16 lg:block"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(13,38,30,0.55) 100%)" }}
              />
            ) : null}
            {/* Price chip — top-right overlay */}
            {startingPrice ? (
              <span
                className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                style={{
                  background: "var(--color-brand-accent)",
                  color: "#0a1f14",
                  boxShadow: "0 1px 5px rgba(176,241,34,0.14)",
                }}
              >
                <Tag className="size-3.5" aria-hidden />
                {startingPrice}
              </span>
            ) : null}
            {/* Icon circle — bottom-left overlay */}
            <span
              className="absolute bottom-3 left-3 inline-flex size-10 items-center justify-center rounded-full"
              style={{
                background: "rgba(10,31,20,0.65)",
                border: "1px solid rgba(255,255,255,0.18)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <Stethoscope className="size-[18px] text-white" strokeWidth={1.5} aria-hidden />
            </span>
          </div>

          {/* Body — natural height; photo above takes the stretch. */}
          <div className={cn("relative flex flex-col p-5 sm:p-6", featured && "flex-1 lg:p-8")}>
            <h3
              className={cn(
                "font-extrabold tracking-[-0.02em] leading-tight transition-colors duration-200 group-hover:text-[var(--color-brand-accent)]",
                featured ? "text-xl lg:text-3xl" : "text-xl",
              )}
              style={{ color: "rgba(255,255,255,0.95)" }}
            >
              {title}
            </h3>
            <p
              className={cn(
                "mt-2 text-sm leading-relaxed",
                featured ? "lg:mt-3 lg:text-base lg:max-w-[44ch] line-clamp-3" : "line-clamp-2",
              )}
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              {description}
            </p>

            {duration ? (
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }}
                >
                  <Clock className="size-3.5" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                  {duration}
                </span>
              </div>
            ) : null}

            <div className="mt-auto">
              {twoButton ? (
                <TwoActions
                  detailHref={detailHref!}
                  bookHref={bookHref!}
                  learnLabel={learnLabel}
                  bookLabel={bookLabel}
                  title={title}
                  dark
                />
              ) : (
                /* CTA pill */
                <div
                  className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-[background-color,color] duration-200 group-hover:bg-white group-hover:text-[var(--color-brand-primary)]"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "rgba(255,255,255,0.90)",
                  }}
                >
                  {learnLabel}
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                    aria-hidden
                  />
                </div>
              )}
            </div>
          </div>
        </article>
      );
    }

    // Glass card — no image
    return (
      <article
        className={cn(
          "group relative flex h-full flex-col overflow-hidden gh2-glass-forest gh2-glass-hover",
          className,
        )}
      >
        {overlay}
        <div className="relative flex h-full flex-col p-6 sm:p-7">
          <h3
            className="text-lg font-bold tracking-[-0.01em] transition-colors duration-200 group-hover:text-[var(--color-brand-accent)]"
            style={{ color: "rgba(255,255,255,0.88)" }}
          >
            {title}
          </h3>
          <p
            className="mt-2 flex-1 text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.72)" }}
          >
            {description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {duration ? (
              <span className="gh2-meta-chip-dark gh2-meta-chip">
                <Clock className="size-3.5" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                {duration}
              </span>
            ) : null}
            {startingPrice ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: "rgba(176,241,34,0.12)", color: "var(--color-brand-accent)" }}
              >
                <Tag className="size-3.5" aria-hidden />
                {startingPrice}
              </span>
            ) : null}
          </div>

          {twoButton ? (
            <TwoActions
              detailHref={detailHref!}
              bookHref={bookHref!}
              learnLabel={learnLabel}
              bookLabel={bookLabel}
              title={title}
              dark
            />
          ) : (
            <div
              className="mt-5 flex items-center gap-2 text-sm font-semibold transition-colors duration-200 group-hover:text-[var(--color-brand-accent)]"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              <span>{learnLabel}</span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden />
            </div>
          )}
        </div>
      </article>
    );
  }

  // Light (default)
  return (
    <article
      className={cn(
        "group relative h-full overflow-hidden gh2-card-ivory gh2-card-hover",
        featured && imageSrc ? "flex flex-col lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : "flex flex-col",
        className,
      )}
    >
      {overlay}
      {imageSrc ? (
        <div
          className={cn(
            "relative w-full overflow-hidden",
            featured ? "aspect-[16/9] lg:aspect-auto lg:h-full" : "flex-1",
          )}
          style={{
            ...(featured ? {} : { aspectRatio: "16 / 9" }),
            background: "var(--color-background-soft)",
          }}
        >
          <Image
            src={imageSrc}
            alt={title}
            fill
            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            unoptimized={isUnoptimizedImageSrc(imageSrc)}
            className="object-cover"
          />
        </div>
      ) : null}
      <div className={cn("relative flex flex-col p-6 sm:p-7", (!imageSrc || featured) && "h-full")}>
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand-primary)]">
          {title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
          {description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {duration ? (
            <span className="gh2-meta-chip">
              <Clock className="size-3.5 text-[var(--color-brand-primary)]" aria-hidden />
              {duration}
            </span>
          ) : null}
          {startingPrice ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-accent)]/15 px-3 py-1 text-xs font-semibold text-[var(--color-brand-primary)]">
              <Tag className="size-3.5" aria-hidden />
              {startingPrice}
            </span>
          ) : null}
        </div>

        {twoButton ? (
          <TwoActions
            detailHref={detailHref!}
            bookHref={bookHref!}
            learnLabel={learnLabel}
            bookLabel={bookLabel}
            title={title}
            dark={false}
          />
        ) : (
          <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-primary)]">
            <span>{learnLabel}</span>
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden />
          </div>
        )}
      </div>
    </article>
  );
}

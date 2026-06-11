"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Tag, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils/cn";

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
  dark,
}: {
  detailHref: string;
  bookHref: string;
  learnLabel: string;
  bookLabel: string;
  dark: boolean;
}) {
  return (
    <div className="relative z-10 mt-6 grid grid-cols-2 gap-2.5">
      <Link
        href={detailHref}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold tracking-[-0.005em] transition-[background-color,color,border-color] duration-200 focus-visible:outline-none",
          dark
            ? "border border-white/25 bg-white/[0.06] text-white/90 hover:bg-white hover:text-[var(--color-brand-primary)]"
            : "border border-[var(--color-border-strong)] bg-transparent text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)] hover:border-[var(--color-brand-primary)] hover:text-white",
        )}
      >
        {learnLabel}
        <ArrowRight className="size-4 shrink-0" aria-hidden />
      </Link>
      <Link
        href={bookHref}
        className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-extrabold tracking-[-0.005em] transition-[transform,filter,box-shadow,background-color] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        style={
          dark
            ? {
                background: "var(--color-brand-accent)",
                color: "#0a1f14",
                boxShadow: "0 8px 24px rgba(176,241,34,0.22)",
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
      </Link>
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
}: ServiceCardProps) {
  const twoButton = Boolean(detailHref && bookHref);
  // Card-wide overlay target: detail page in two-CTA mode, else the legacy href.
  const overlayHref = twoButton ? detailHref! : href;
  const learnLabel = ctaLabel ?? "Learn more";

  // Card-wide overlay link — a sibling (not parent) of the footer buttons so
  // there are no nested anchors. In single-CTA mode it is the only link.
  const overlay = overlayHref ? (
    <Link
      href={overlayHref}
      aria-label={`${learnLabel}: ${title}`}
      className="absolute inset-0 z-[1] rounded-[var(--radius-card)] focus:outline-none"
      tabIndex={twoButton ? -1 : 0}
    />
  ) : null;

  if (dark) {
    // Image-top card (DoctorCard structure): photo region with price chip
    // overlay, glass body with title/description/chips and CTA footer.
    if (imageSrc) {
      return (
        <article
          className={cn(
            "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] gh2-card",
            "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            className,
          )}
          style={{
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.11)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        >
          {overlay}
          {/* Photo */}
          <div className="relative overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            {/* Bottom fade so the body edge reads clean */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-16"
              style={{ background: "linear-gradient(180deg, transparent 0%, rgba(13,38,30,0.55) 100%)" }}
            />
            {/* Price chip — top-right overlay */}
            {startingPrice ? (
              <span
                className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                style={{
                  background: "var(--color-brand-accent)",
                  color: "#0a1f14",
                  boxShadow: "0 2px 10px rgba(176,241,34,0.35)",
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

          {/* Body */}
          <div className="relative flex flex-1 flex-col p-5 sm:p-6">
            <h3
              className="text-xl font-extrabold tracking-[-0.02em] leading-tight transition-colors duration-200 group-hover:text-[var(--color-brand-accent)]"
              style={{ color: "rgba(255,255,255,0.95)" }}
            >
              {title}
            </h3>
            <p
              className="mt-2 text-sm leading-relaxed line-clamp-2"
              style={{ color: "rgba(255,255,255,0.55)" }}
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
          "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]",
          "transition-[transform,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
          className,
        )}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
        }}
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
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            {description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {duration ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.70)" }}
              >
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
              dark
            />
          ) : (
            <div
              className="mt-5 flex items-center gap-2 text-sm font-semibold transition-colors duration-200 group-hover:text-[var(--color-brand-accent)]"
              style={{ color: "rgba(255,255,255,0.55)" }}
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
        "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-card)] transition-all duration-200 hover:border-[var(--color-brand-primary)]/20 hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      {overlay}
      {imageSrc ? (
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "16 / 9", background: "var(--color-background-soft)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      ) : null}
      <div className="relative flex h-full flex-col p-6 sm:p-7">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-brand-primary)]">
          {title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
          {description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {duration ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-soft)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
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

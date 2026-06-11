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
 *  via z-index so each button's own navigation fires. */
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
    <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2.5">
      <Link
        href={detailHref}
        className={cn(
          "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none",
          dark
            ? "text-[rgba(255,255,255,0.85)] hover:text-white"
            : "text-[var(--color-brand-primary)] hover:opacity-80",
        )}
        style={{
          border: dark ? "1px solid rgba(255,255,255,0.20)" : "1px solid var(--color-border)",
        }}
      >
        {learnLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
      <Link
        href={bookHref}
        className={cn(
          "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition-[opacity,transform] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none",
        )}
        style={{
          background: dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)",
          color: dark ? "#0a1f14" : "#ffffff",
        }}
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
    // Full-bleed immersive card when image is present
    if (imageSrc) {
      return (
        <article
          className={cn(
            "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)]",
            "transition-[transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            className,
          )}
          style={{ minHeight: 400 }}
        >
          {overlay}
          {/* Background image */}
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {/* Forest green overlay — light at top, opaque at bottom */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(175deg, rgba(10,31,20,0.50) 0%, rgba(10,31,20,0.75) 45%, rgba(8,22,15,0.96) 100%)",
              }}
            />
          </div>

          {/* Content */}
          <div className="relative flex h-full flex-col p-6 sm:p-7">
            {/* Icon circle */}
            <span
              className="inline-flex size-11 items-center justify-center rounded-full"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <Stethoscope className="size-5 text-white" strokeWidth={1.5} aria-hidden />
            </span>

            {/* Text pushed to bottom */}
            <div className="mt-auto pt-8">
              <h3
                className="text-2xl font-extrabold tracking-[-0.02em] leading-tight transition-colors duration-200 group-hover:text-[var(--color-brand-accent)]"
                style={{ color: "rgba(255,255,255,0.95)" }}
              >
                {title}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.52)" }}
              >
                {description}
              </p>

              {/* Chips */}
              {(duration || startingPrice) ? (
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  {duration ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.75)" }}
                    >
                      <Clock className="size-3.5" style={{ color: "var(--color-brand-accent)" }} aria-hidden />
                      {duration}
                    </span>
                  ) : null}
                  {startingPrice ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                      style={{ background: "rgba(176,241,34,0.14)", color: "var(--color-brand-accent)" }}
                    >
                      <Tag className="size-3.5" aria-hidden />
                      {startingPrice}
                    </span>
                  ) : null}
                </div>
              ) : null}

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

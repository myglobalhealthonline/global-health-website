"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type CarouselNavProps = {
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  /**
   * 0..1 fill of the progress hairline. Paged callers pass
   * (page + 1) / totalPages; scroll carousels pass scroll progress
   * (or a CSS var — see `progressVar`).
   */
  progress?: number;
  /**
   * Alternative to `progress`: name of a CSS custom property set on an
   * ancestor (e.g. "--scroll-progress") that drives the fill without
   * re-rendering React on every scroll frame.
   */
  progressVar?: string;
  dark?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  /** Page info for screen readers; also drives the dots in `variant="segments"`. */
  page?: number;
  totalPages?: number;
  /** "hairline" (default) — continuous fill bar. "segments" — one dot per
   *  page, current page accent-filled. Requires `page` + `totalPages`. */
  variant?: "hairline" | "segments";
};

/**
 * Shared prev/next carousel control. Replaces the per-section hand-rolled
 * pagers. Two visual variants: a continuous progress hairline (default,
 * works for scroll carousels via `progressVar`) or page-precise segments.
 */
export function CarouselNav({
  onPrev,
  onNext,
  canPrev,
  canNext,
  progress,
  progressVar,
  dark = true,
  prevLabel = "Previous",
  nextLabel = "Next",
  page,
  totalPages,
  variant = "hairline",
}: CarouselNavProps) {
  const arrowStyle = (enabled: boolean) =>
    enabled
      ? {
          background: dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)",
          borderColor: dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)",
          color: dark ? "#0a1f14" : "#ffffff",
        }
      : {
          background: "transparent",
          borderColor: dark ? "rgba(255,255,255,0.14)" : "rgba(29,75,54,0.20)",
          color: dark ? "rgba(255,255,255,0.28)" : "rgba(29,75,54,0.32)",
        };

  const fillWidth = progressVar
    ? `calc(max(0.12, var(${progressVar}, 0)) * 100%)`
    : `${Math.round(Math.max(0.12, Math.min(1, progress ?? 0)) * 100)}%`;

  return (
    <div className="flex items-center gap-3 shrink-0">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        aria-label={prevLabel}
        className="gh-focus-on-dark inline-flex size-11 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-150 disabled:cursor-not-allowed"
        style={arrowStyle(canPrev)}
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
      {variant === "segments" && page !== undefined && totalPages !== undefined ? (
        <div aria-hidden className="flex items-center gap-[5px]">
          {Array.from({ length: totalPages }, (_, i) => (
            <span
              key={i}
              className="h-[3px] w-[22px] rounded-full transition-colors duration-200"
              style={{
                background:
                  i === page
                    ? dark
                      ? "var(--color-brand-accent)"
                      : "var(--color-brand-primary)"
                    : dark
                      ? "rgba(255,255,255,0.16)"
                      : "rgba(29,75,54,0.18)",
              }}
            />
          ))}
        </div>
      ) : (
        <div
          aria-hidden
          className="h-[3px] w-16 overflow-hidden rounded-full sm:w-20"
          style={{ background: dark ? "rgba(255,255,255,0.14)" : "rgba(29,75,54,0.15)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-200"
            style={{
              background: dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)",
              width: fillWidth,
            }}
          />
        </div>
      )}
      {page !== undefined && totalPages !== undefined ? (
        <span aria-live="polite" className="sr-only">
          {page + 1} / {totalPages}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label={nextLabel}
        className="gh-focus-on-dark inline-flex size-11 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-150 disabled:cursor-not-allowed"
        style={arrowStyle(canNext)}
      >
        <ChevronRight size={16} aria-hidden />
      </button>
    </div>
  );
}

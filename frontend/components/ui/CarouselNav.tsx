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
  /** Optional page info for screen readers (visually the hairline replaces the counter). */
  page?: number;
  totalPages?: number;
};

/**
 * Shared prev/next carousel control — variant B "progress hairline".
 * One 38px ghost arrow, a 72px hairline that fills with progress, one
 * accent-filled arrow. Replaces the per-section hand-rolled pagers.
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
        className="gh-focus-on-dark inline-flex size-9 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-150 disabled:cursor-not-allowed"
        style={arrowStyle(canPrev)}
      >
        <ChevronLeft size={16} aria-hidden />
      </button>
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
        className="gh-focus-on-dark inline-flex size-9 items-center justify-center rounded-full border transition-[background-color,border-color,color] duration-150 disabled:cursor-not-allowed"
        style={arrowStyle(canNext)}
      >
        <ChevronRight size={16} aria-hidden />
      </button>
    </div>
  );
}

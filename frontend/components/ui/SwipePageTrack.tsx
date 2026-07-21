"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

type SwipePageTrackProps<T> = {
  /** Pre-chunked items, one array per page. All pages render at once (as
   *  native scroll-snap children) so touch/trackpad drag gets real browser
   *  momentum and rubber-banding — the same mechanism DoctorCarousel uses,
   *  applied per page-block instead of per card. */
  pages: T[][];
  page: number;
  onPageChange: (page: number) => void;
  renderPage: (items: T[], pageIndex: number) => ReactNode;
  className?: string;
};

/**
 * Horizontal scroll-snap track where each "page" is a full-width snap
 * child. Replaces the old instant React-state page swap (no drag
 * feedback, felt broken) with native glide: dragging follows the finger
 * in real time and the browser handles momentum/snapping. `page` stays
 * the single source of truth — CarouselNav buttons/dots update it, this
 * component scrolls the track to match; native swipes update it back via
 * the scroll listener.
 */
export function SwipePageTrack<T>({
  pages,
  page,
  onPageChange,
  renderPage,
  className,
}: SwipePageTrackProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafPending = useRef(false);
  // Scroll events fired by our own `scrollTo` below shouldn't re-derive a
  // page index mid-animation and fight the target page.
  const scrollingToPage = useRef<number | null>(null);

  const syncFromScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (scrollingToPage.current !== null) {
      if (idx === scrollingToPage.current) scrollingToPage.current = null;
      else return;
    }
    if (idx !== page) onPageChange(idx);
  }, [page, onPageChange]);

  const onScroll = useCallback(() => {
    if (rafPending.current) return;
    rafPending.current = true;
    requestAnimationFrame(() => {
      rafPending.current = false;
      syncFromScroll();
    });
  }, [syncFromScroll]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const target = page * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 2) {
      scrollingToPage.current = page;
      el.scrollTo({ left: target, behavior: "smooth" });
    }
  }, [page]);

  return (
    <div
      ref={trackRef}
      onScroll={onScroll}
      className={`gh-scrollbar-none flex snap-x snap-mandatory overflow-x-auto scroll-smooth ${className ?? ""}`.trim()}
    >
      {pages.map((items, i) => (
        <div key={i} className="w-full shrink-0 snap-start">
          {renderPage(items, i)}
        </div>
      ))}
    </div>
  );
}

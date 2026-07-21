"use client";

import { useRef } from "react";

/**
 * Touch-swipe → prev/next page, for grids that page by slicing content
 * (no native scroll track to swipe, unlike DoctorCarousel's scroll-snap
 * strip). Horizontal-dominant swipes only, so vertical page scroll is
 * never hijacked — deliberately no preventDefault, touch listeners stay
 * passive.
 */
export function useSwipePage(onPrev: () => void, onNext: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!start.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) onNext();
      else onPrev();
    },
  };
}

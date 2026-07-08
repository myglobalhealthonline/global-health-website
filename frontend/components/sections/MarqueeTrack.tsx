"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Shared marquee belt for CountryMarquee + TrustMarquee. The scrolling
 * animation lives in CSS (.gh-marquee-track); this wrapper only pauses it
 * — and releases its GPU layer — while the belt is off-screen, via an
 * IntersectionObserver that toggles `.is-paused`. Reduced-motion is handled
 * in CSS (animation:none), so toggling the class there is a harmless no-op.
 */
export function MarqueeTrack({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => el.classList.toggle("is-paused", !entry.isIntersecting),
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ul
      ref={ref}
      className="gh-marquee-track flex shrink-0 items-center gap-12 md:gap-16 whitespace-nowrap pr-12 md:pr-16"
    >
      {children}
    </ul>
  );
}

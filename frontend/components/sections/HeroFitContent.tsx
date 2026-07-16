"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scale-to-fit wrapper for the right panel of split heroes
 * (.gh-inline-split-hero). The split hero targets one viewport height at lg
 * (min-height: 100svh - header). The grid row itself grows with content (a
 * floor, not a cap — nothing is ever clipped), so the fit budget must be the
 * VIEWPORT, not the panel box: measuring the panel would always return the
 * content's own height and the scale would never fire. When the content's
 * natural height exceeds the viewport budget, scale it down as one piece
 * (object-fit: contain style) so the hero fits the fold with no inner
 * scrollbar.
 *
 * Two-column only (>=1024px) — below that the page flows and scrolls
 * naturally. Only ever scales DOWN; floors at 0.5 as an extreme-viewport
 * safeguard (below the floor the section simply grows and the page scrolls).
 */
export default function HeroFitContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    const inner = innerRef.current;
    // Panel = the padded, fixed-height flex column the slot sits in.
    const panel = slot?.parentElement;
    if (!slot || !inner || !panel) return;

    let raf = 0;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (window.innerWidth < 1024) {
          inner.style.removeProperty("transform");
          slot.style.removeProperty("height");
          return;
        }
        // offsetHeight is the UNSCALED layout height (ignores the transform),
        // so measuring never feeds back into the scale it produces.
        const natural = inner.offsetHeight;
        if (!natural) return;
        const cs = getComputedStyle(panel);
        // Viewport budget: the hero's target height is
        // 100svh - header-height (the grid's min-height floor). The panel's
        // own clientHeight can't be the budget — the grid row grows with the
        // panel content, so that measurement always "fits" and never scales.
        const headerH =
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--header-height",
            ),
          ) || 0;
        const avail =
          window.innerHeight -
          headerH -
          parseFloat(cs.paddingTop) -
          parseFloat(cs.paddingBottom);
        if (avail <= 0) return;
        // 0.5 floor = extreme-viewport safeguard; below it the section grows
        // past the viewport and the page scrolls (never clips).
        const fit = Math.max(0.5, Math.min(1, avail / natural));
        if (fit < 1) {
          inner.style.transform = `scale(${fit.toFixed(4)})`;
          inner.style.transformOrigin = "top left";
          // Reserve only the scaled height so justify-center stays true.
          slot.style.height = `${Math.round(natural * fit)}px`;
        } else {
          inner.style.removeProperty("transform");
          slot.style.removeProperty("height");
        }
      });
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(inner);
    ro.observe(panel);
    window.addEventListener("resize", apply);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, []);

  return (
    <div ref={slotRef} className={className}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

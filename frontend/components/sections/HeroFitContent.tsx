"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scale-to-fit wrapper for the right panel of split heroes
 * (.gh-inline-split-hero). The panel has a fixed viewport-tracking height at
 * lg; when the content's natural height exceeds the available space the panel
 * used to scroll internally. Instead, scale the content down as one piece
 * (object-fit: contain style) so everything fits with no inner scrollbar.
 *
 * Two-column only (>=1024px) — below that the page flows and scrolls
 * naturally. Only ever scales DOWN; floors at 0.72 to keep text legible
 * (below the floor the panel's lg:overflow-y-auto fallback scrolls the small
 * remainder).
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
        const avail =
          panel.clientHeight -
          parseFloat(cs.paddingTop) -
          parseFloat(cs.paddingBottom);
        if (avail <= 0) return;
        // 0.5 floor = extreme-viewport safeguard; below it the panel's
        // lg:overflow-y-auto fallback scrolls the remainder.
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

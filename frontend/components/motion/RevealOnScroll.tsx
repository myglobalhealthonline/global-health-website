"use client";

/**
 * RevealOnScroll — IntersectionObserver-driven entry animation.
 *
 * Uses JS-driven CSS transitions (not CSS keyframe classes) for reliability
 * in Next.js SSR + React hydration. CSS animations can be cancelled by React
 * reconciliation; transitions triggered after IO fire are immune.
 *
 * Usage:
 *   // Single element fade-up on scroll:
 *   <RevealOnScroll><MyCard /></RevealOnScroll>
 *
 *   // Staggered list:
 *   <RevealOnScroll stagger className="grid grid-cols-3 gap-6">
 *     <Card /><Card /><Card />
 *   </RevealOnScroll>
 *
 * Progressive enhancement: SSR content renders visible. JS hides elements
 * on mount, IO fires → transition to visible. If JS is off, content stays
 * visible always.
 */

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  stagger?: boolean;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  threshold?: number;
  rootMargin?: string;
}

const EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "0.7s";
const STAGGER_STEP = 75; // ms between each child

export function RevealOnScroll({
  children,
  stagger = false,
  delay = 0,
  className = "",
  style,
  threshold = 0.08,
  rootMargin = "-48px 0px",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Touch devices: never hide content behind the observer. On slow phones
    // a fast scroll outruns IO + double-RAF and sections show up blank/late.
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const targets: HTMLElement[] = stagger
      ? (Array.from(el.children) as HTMLElement[])
      : [el];

    // Hide on mount (before IO fires)
    targets.forEach((t) => {
      t.style.opacity = "0";
      t.style.transform = "translateY(24px)";
      t.style.transition = "none";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;

        // Double-RAF: paint hidden state first, then trigger transition
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            targets.forEach((t, i) => {
              const d = delay + (stagger ? i * STAGGER_STEP : 0);
              t.style.transition = [
                `opacity ${DURATION} ${EASING} ${d}ms`,
                `transform ${DURATION} ${EASING} ${d}ms`,
              ].join(", ");
              t.style.opacity = "1";
              t.style.transform = "translateY(0)";
            });
          });
        });

        observer.disconnect();
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [stagger, delay, threshold, rootMargin]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

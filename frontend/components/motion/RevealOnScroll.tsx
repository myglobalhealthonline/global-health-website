"use client";

/**
 * RevealOnScroll — IntersectionObserver-driven entry animation.
 *
 * CSS-hidden-before-paint: targets render with the `gh-reveal-pending` class
 * (globals.css) from the server. That class only actually hides content once
 * the `js` class lands on <html> — a synchronous inline script in
 * layout.tsx runs before first paint — so JS visitors never see a flash of
 * visible content before it's hidden, and no-JS/SSR visitors stay visible
 * always. IO adds `gh-reveal-in` to reveal; both classes are plain DOM
 * mutations (no React state), immune to reconciliation resetting them.
 *
 * Usage:
 *   // Single element fade-up on scroll:
 *   <RevealOnScroll><MyCard /></RevealOnScroll>
 *
 *   // Staggered list:
 *   <RevealOnScroll stagger className="grid grid-cols-3 gap-6">
 *     <Card /><Card /><Card />
 *   </RevealOnScroll>
 */

import { useLayoutEffect, useRef, type ReactNode, type CSSProperties } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  stagger?: boolean;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  threshold?: number;
  rootMargin?: string;
  role?: string;
}

const STAGGER_STEP = 75; // ms between each child

export function RevealOnScroll({
  children,
  stagger = false,
  delay = 0,
  className = "",
  style,
  threshold = 0.08,
  // Huge top margin: an element jumped PAST (fast scroll, anchor link,
  // scroll restoration) still counts as intersecting once it's above the
  // viewport, so it reveals instead of staying hidden — a plain 0px top
  // margin never fires IO for below→above jumps that skip the viewport.
  rootMargin = "10000px 0px -10%",
  role,
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets: HTMLElement[] = stagger
      ? (Array.from(el.children) as HTMLElement[])
      : [el];

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Touch devices: never hide content behind the observer. On slow phones
    // a fast scroll outruns IO and sections show up blank/late.
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    if (reduced || coarse) {
      targets.forEach((t) => t.classList.add("gh-reveal-in"));
      return;
    }

    targets.forEach((t, i) => {
      const d = delay + (stagger ? i * STAGGER_STEP : 0);
      t.style.transitionDelay = `${d}ms`;
      t.classList.add("gh-reveal-pending");
    });

    // Already in view at mount (e.g. above-the-fold, or fast scroll landed
    // past it before hydration): reveal immediately, no transition.
    const rect = el.getBoundingClientRect();
    const alreadyVisible =
      rect.top < window.innerHeight * (1 - 0.1) && rect.bottom > 0;
    if (alreadyVisible) {
      targets.forEach((t) => {
        t.style.transition = "none";
        t.classList.add("gh-reveal-in");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        targets.forEach((t) => t.classList.add("gh-reveal-in"));
        observer.disconnect();
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [stagger, delay, threshold, rootMargin]);

  return (
    <div
      ref={ref}
      className={
        stagger
          ? `gh-reveal-stagger ${className}`.trim()
          : `gh-reveal-pending ${className}`.trim()
      }
      style={style}
      role={role}
    >
      {children}
    </div>
  );
}

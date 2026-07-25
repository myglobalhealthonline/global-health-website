"use client";

/**
 * RevealOnScroll — IntersectionObserver-driven entry animation.
 *
 * Content ships visible. The layout effect below adds the hiding classes
 * (`gh-reveal-pending` / `gh-reveal-stagger`, globals.css, gated on `html.js`)
 * and IO adds `gh-reveal-in` to reveal — all plain DOM mutations (no React
 * state), immune to reconciliation resetting them. Hiding from SSR instead
 * would blank out any subtree whose JS has not mounted yet; see the note
 * above the JSX.
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

    // Nothing is hidden until this effect runs (see the note on the JSX
    // below), so reduced-motion / touch just leave the content alone.
    if (reduced || coarse) return;

    if (stagger) el.classList.add("gh-reveal-stagger");
    targets.forEach((t, i) => {
      const d = delay + (stagger ? i * STAGGER_STEP : 0);
      t.style.transitionDelay = `${d}ms`;
      t.classList.add("gh-reveal-pending");
    });

    // Already in view at mount (e.g. above-the-fold, or fast scroll landed
    // past it before hydration): reveal immediately, no transition.
    const rect = el.getBoundingClientRect();
    // No `rect.bottom > 0`: an element already scrolled PAST also reveals
    // instantly rather than waiting a frame for IO.
    const alreadyVisible = rect.top < window.innerHeight * (1 - 0.1);
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

  // Visible-until-hidden, NOT hidden-until-revealed: the hiding classes are
  // added by the layout effect above, never by SSR. Shipping them from the
  // server meant any subtree that had not mounted yet — every RevealOnScroll
  // inside a <LazyHydrate>, which only mounts ~600px before the viewport —
  // sat on screen as an empty box until hydration caught up. Fast scrolling
  // outran it and whole sections rendered blank. useLayoutEffect runs before
  // paint of its own commit, so there is still no visible hide-flash.
  return (
    <div
      ref={ref}
      className={className || undefined}
      style={style}
      role={role}
    >
      {children}
    </div>
  );
}

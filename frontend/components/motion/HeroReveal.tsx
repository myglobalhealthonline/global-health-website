"use client";

/**
 * HeroReveal — CSS-class-driven transition for above-fold elements.
 *
 * CSS-hidden-before-paint: renders with `gh-reveal-pending` (globals.css)
 * from the server. That class only actually hides content once the `js`
 * class lands on <html> — a synchronous inline script in layout.tsx runs
 * before first paint — so JS visitors never see a flash of visible content
 * before it's hidden, and no-JS/SSR visitors stay visible always.
 *
 * Usage:
 *   <HeroReveal delay={0} className="mb-10 flex ...">
 *     <div>badge row</div>
 *   </HeroReveal>
 *
 *   <HeroReveal delay={150}>
 *     <h1>headline</h1>
 *   </HeroReveal>
 */

import { useLayoutEffect, useRef, type ReactNode, type CSSProperties } from "react";

interface HeroRevealProps {
  children: ReactNode;
  /** Delay in ms before the reveal transition starts. */
  delay?: number;
  /**
   * Set false for the LCP element (hero headline): elements first painted at
   * opacity 0 are permanently excluded as LCP candidates (NO_LCP / inflated
   * LCP on real devices), so it slides in via transform only.
   */
  fade?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function HeroReveal({
  children,
  delay = 0,
  fade = true,
  className = "",
  style,
}: HeroRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect OS-level reduced-motion: skip animation, just show content
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("gh-reveal-in");
      return;
    }

    el.style.transitionDelay = `${delay}ms`;
    // Double-RAF: let the pending (hidden) state paint first, then trigger
    // the transition — matches original setTimeout deferral behavior.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        el.classList.add("gh-reveal-in");
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`gh-reveal-pending ${className}`.trim()}
      style={{
        ...style,
        // LCP element: never paint at opacity 0 (excludes it as an LCP
        // candidate) — slide in via transform only, class stays for the
        // transform/transition mechanics but opacity is pinned to 1.
        ...(fade ? null : { opacity: 1 }),
      }}
    >
      {children}
    </div>
  );
}

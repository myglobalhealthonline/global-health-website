"use client";

/**
 * HeroReveal — React-state-driven CSS transition for above-fold elements.
 *
 * Why not CSS keyframes or direct DOM mutations?
 * - CSS keyframes: broken by React hydration (animation restarts/cancelled)
 * - Direct DOM mutations: React reconciliation resets inline styles between renders
 *
 * React state approach: opacity/transform are JSX props → React owns them →
 * reconciliation never fights us. CSS transition fires when state changes.
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

import { useState, useEffect, type ReactNode, type CSSProperties } from "react";

interface HeroRevealProps {
  children: ReactNode;
  /** Delay in ms before the reveal transition starts. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
}

const EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
const DURATION = "0.9s";

export function HeroReveal({
  children,
  delay = 0,
  className = "",
  style,
}: HeroRevealProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Respect OS-level reduced-motion: skip animation, just show content
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealed(true);
      return;
    }
    const id = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(id);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        ...style,
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0px)" : "translateY(32px)",
        // Add transition only when revealing — prevents instant re-hide on unmount
        transition: revealed
          ? `opacity ${DURATION} ${EASING}, transform ${DURATION} ${EASING}`
          : "none",
      }}
    >
      {children}
    </div>
  );
}

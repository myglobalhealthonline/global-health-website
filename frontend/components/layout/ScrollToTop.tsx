"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Guarantees every page opens at the very top.
 *
 * 1. Disables the browser's automatic scroll restoration, so a refresh
 *    never reopens a page mid-scroll (the default "auto" behaviour
 *    restored the previous offset and left the hero hidden under the
 *    sticky header).
 * 2. Snaps to the top on every route change — covers navbar links and
 *    any programmatic navigation.
 *
 * Mounted once at the root so it applies to every page. In-page hash
 * links (e.g. "#doctor-grid") keep the same pathname, so anchor jumps
 * are left untouched.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof history !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    // Snap immediately, then re-correct after paint and once more shortly
    // after. Heavy pages (negative-margin hero, late-mounting globe
    // canvas / images) settle their layout over a few frames and would
    // otherwise leave the page a couple dozen px down. The short window
    // is well within a navigation, so it never fights real user scroll.
    // The two follow-ups only write when the page actually drifted from the
    // top, so the common case (immediate snap stuck) costs zero extra
    // scroll/layout writes.
    window.scrollTo(0, 0);
    const correct = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    const raf = requestAnimationFrame(correct);
    const t = setTimeout(correct, 120);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [pathname]);

  return null;
}

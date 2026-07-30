"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Guarantees every page opens at the very top — for forward navigations.
 *
 * 1. Disables the browser's automatic scroll restoration, so a refresh
 *    never reopens a page mid-scroll (the default "auto" behaviour
 *    restored the previous offset and left the hero hidden under the
 *    sticky header).
 * 2. Snaps to the top on every route change caused by a normal forward
 *    navigation — navbar links and any programmatic navigation.
 *
 * Browser back/forward (`popstate`) is deliberately excluded from the
 * forced snap: yanking the scroll position back to 0 on every pathname
 * change fights the position the user (and the back/forward gesture)
 * expects to land on. The `popstate` listener below flags the next
 * pathname-change effect run as a known back/forward nav so it can skip
 * the correction — see P-022 in docs/audits/performance/performance-audit-2-2026-07-10.md.
 *
 * Mounted once at the root so it applies to every page. In-page hash
 * links (e.g. "#doctor-grid") keep the same pathname, so anchor jumps
 * are left untouched.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const isPopNav = useRef(false);

  useEffect(() => {
    if (typeof history !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    const onPopState = () => {
      isPopNav.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (isPopNav.current) {
      // Known back/forward navigation — leave the scroll position alone.
      isPopNav.current = false;
      return;
    }
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

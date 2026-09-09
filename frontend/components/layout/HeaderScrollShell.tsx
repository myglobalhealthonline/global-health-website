"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Collapsed-pill max-width (grows past this only when the nav needs it). */
const PILL_MAX = 1360;
/** Expanded top-of-page bar max-width. */
const BAR_MAX = 1760;

/**
 * Owns only the scroll-reactive glass toggle for the sticky header — a
 * full-width bar at the very top that condenses into a floating rounded
 * pill once the page scrolls. Everything else about the header (brand,
 * nav, switchers, CTA) is server-rendered content passed as `children`,
 * so this client boundary stays as small as the effect it wraps.
 */
export function HeaderScrollShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Content-based fit. The section nav is shown by breakpoint at xl+, but a
  // long locale (RO/PT/CZ) can still need more than the collapsed pill.
  // Measure what the row needs (brand + nav + actions + gaps + padding) and
  // 1) let the scrolled pill grow to that width (capped by the full bar),
  // 2) drop to the drawer only when even the full bar cannot hold it.
  // `required` is remembered because the nav is display:none once collapsed
  // and cannot be measured until it comes back.
  const [pillWidth, setPillWidth] = useState(PILL_MAX);
  const requiredRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const header = grid?.closest("header");
    const outer = grid?.parentElement;
    if (!grid || !header || !outer) return;
    const measure = () => {
      const ocs = getComputedStyle(outer);
      const available = Math.min(
        outer.clientWidth - parseFloat(ocs.paddingLeft) - parseFloat(ocs.paddingRight),
        BAR_MAX,
      );
      const collapsed = header.hasAttribute("data-nav-overflow");
      if (!collapsed) {
        const nav = grid.querySelector<HTMLElement>(".gh-header-navCenter");
        const inner = nav?.firstElementChild as HTMLElement | null;
        const brand = grid.firstElementChild as HTMLElement | null;
        const actions = grid.querySelector<HTMLElement>(".gh-header-actions");
        if (!nav || !inner || !brand || !actions || nav.clientWidth === 0) return;
        const cs = getComputedStyle(grid);
        const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const gap = parseFloat(cs.columnGap) || 0;
        // The nav is justify-self:center, so its own box is always its
        // content width — measure the pieces, not the column track.
        requiredRef.current =
          pad + brand.offsetWidth + actions.offsetWidth + 2 * gap + inner.scrollWidth + 8;
      }
      const required = requiredRef.current;
      if (required === null) return;
      if (required > available) {
        if (!collapsed) header.setAttribute("data-nav-overflow", "");
      } else if (collapsed) {
        header.removeAttribute("data-nav-overflow");
      }
      setPillWidth(Math.min(Math.max(PILL_MAX, required), available));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    // Actions grow after hydration (session avatar, bell) without the bar
    // itself resizing — re-measure on that too.
    const actions = grid.querySelector(".gh-header-actions");
    if (actions) ro.observe(actions);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let ticking = false;
    // Hysteresis (enter >24px, exit <8px) instead of a single 20px trigger —
    // a bare threshold flips back and forth on every scroll frame that
    // hovers near it (momentum scroll, trackpad micro-movement), each flip
    // re-firing the bar→pill morph (max-width/radius/backdrop-filter) and
    // reading as a flicker right at the top of the page.
    const apply = () => {
      const y = window.scrollY;
      setScrolled((prev) => (y > 24 ? true : y < 8 ? false : prev));
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="gh-header-sticky w-full motion-reduce:!transition-none"
      style={{
        // Expanded: full-width glass bar in the shared --gh-chrome (same glass
        // recipe as the footer + the collapsed pill) — translucent + blur.
        // Transparent once scrolled so the navbar condenses to JUST the
        // floating pill — no full-width bar under it.
        backgroundColor: scrolled ? "transparent" : "var(--gh-chrome)",
        backdropFilter: scrolled ? "none" : "blur(var(--gh-chrome-blur))",
        WebkitBackdropFilter: scrolled ? "none" : "blur(var(--gh-chrome-blur))",
        borderBottomColor: scrolled ? "transparent" : "rgba(167, 243, 11, 0.22)",
        boxShadow: scrolled ? "none" : "var(--gh-chrome-shadow)",
        transition:
          "background-color 300ms ease, backdrop-filter 300ms ease, border-color 300ms ease, box-shadow 300ms ease",
      }}
    >
      <div className="mx-auto w-full px-3 md:px-4" style={{ paddingBlock: 10 }}>
        {/* Ryzon-style morph: a full-width transparent bar across the top of
            the page that condenses into a floating rounded pill (side edges,
            glass, shadow) once the page scrolls. Height stays constant — only
            width / radius / surface change, so nothing reflows. */}
        <div
          ref={gridRef}
          className="grid items-center grid-cols-[auto_minmax(0,1fr)_auto] gap-4 xl:gap-5 2xl:gap-6 px-4 md:px-6 motion-reduce:!transition-none"
          style={{
            maxWidth: scrolled ? pillWidth : BAR_MAX,
            marginInline: "auto",
            paddingBlock: 10,
            borderRadius: scrolled ? 999 : 0,
            // Collapsed pill: glass --gh-chrome — same translucent fill + blur
            // as the expanded bar and the footer, so all chrome is one
            // glassmorphic recipe. Lime hairline + drop shadow + inset
            // highlight keep it reading as a distinct floating capsule.
            background: scrolled ? "var(--gh-chrome)" : "transparent",
            border: scrolled ? "var(--gh-chrome-border)" : "1px solid transparent",
            boxShadow: scrolled ? "var(--gh-chrome-shadow)" : "none",
            backdropFilter: scrolled ? "blur(var(--gh-chrome-blur))" : "none",
            WebkitBackdropFilter: scrolled ? "blur(var(--gh-chrome-blur))" : "none",
            transition:
              "border-radius 500ms ease, background-color 450ms ease, border-color 450ms ease, box-shadow 450ms ease",
          }}
        >
          {children}
        </div>
      </div>
    </header>
  );
}

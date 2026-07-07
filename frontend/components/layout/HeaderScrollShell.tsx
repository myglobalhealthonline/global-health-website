"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Owns only the scroll-reactive glass toggle for the sticky header — a
 * full-width bar at the very top that condenses into a floating rounded
 * pill once the page scrolls. Everything else about the header (brand,
 * nav, switchers, CTA) is server-rendered content passed as `children`,
 * so this client boundary stays as small as the effect it wraps.
 */
export function HeaderScrollShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
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
          className="grid items-center grid-cols-[auto_minmax(0,1fr)_auto] gap-4 xl:gap-5 2xl:gap-6 px-4 md:px-6 motion-reduce:!transition-none"
          style={{
            maxWidth: scrolled ? 1360 : 1760,
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
              "max-width 500ms cubic-bezier(0.16,1,0.3,1), border-radius 500ms ease, background-color 450ms ease, border-color 450ms ease, box-shadow 450ms ease, backdrop-filter 450ms ease",
          }}
        >
          {children}
        </div>
      </div>
    </header>
  );
}

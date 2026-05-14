"use client";

/**
 * Sticky site header.
 *
 * Mirrors `ui_kits/website/Header.jsx` from the design bundle:
 *   • Sticky white-92% bg with backdrop-blur(16px), bottom border
 *   • Grid: brand wordmark / centered country tabs pill / right CTA
 *   • Mint "g" mark + "Global Health" wordmark
 *   • Country tabs: pill-shaped segmented control, white active card with shadow
 *   • Right: "Log in" link + primary "Book" button
 *
 * Mobile collapses to: brand + Book + drawer trigger.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SiteNavigationData } from "@/data/navigation";
import type { AuthUser } from "@/lib/api/auth-api";
import { countries } from "@/data/countries";
import { countrySlug } from "@/lib/routing/country-slug";
import { MobileNav } from "@/components/layout/MobileNav";

// CSS flag-icons class for each country code.
const FLAG_CLASS: Record<string, string> = {
  ie: "fi fi-ie",
  pt: "fi fi-pt",
  sp: "fi fi-es",
  cz: "fi fi-cz",
  rm: "fi fi-ro",
};

function activeCountryFromPath(pathname: string): string | null {
  if (!pathname) return null;
  const slug = pathname.split("/").filter(Boolean)[0];
  if (!slug) return null;
  const match = countries.find((c) => countrySlug(c.code) === slug);
  return match?.code ?? null;
}

export function SiteHeader({
  siteName,
  navigation,
  brandLogo,
  authUser,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  authUser?: AuthUser | null;
}) {
  const pathname = usePathname();
  const activeCountry = activeCountryFromPath(pathname);
  const [, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div
        className="mx-auto grid items-center"
        style={{
          maxWidth: 1320,
          padding: "16px clamp(20px, 4vw, 40px)",
          gridTemplateColumns: "auto 1fr auto",
          gap: 32,
        }}
      >
        {/* Brand wordmark — mint mark + Global Health */}
        <Link
          href="/"
          className="inline-flex items-center gap-2.5"
          style={{ textDecoration: "none" }}
        >
          <span
            className="inline-flex items-center justify-center text-white"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--color-brand-primary)",
              fontFamily: "var(--font-display)",
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            g
          </span>
          <span
            className="text-[var(--color-text-primary)]"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            {siteName || "Global Health"}
          </span>
        </Link>

        {/* Country tabs — pill segmented control */}
        <nav
          className="hidden items-center md:flex"
          style={{
            justifySelf: "center",
            background: "var(--color-background-soft)",
            padding: 4,
            borderRadius: 999,
            border: "1px solid var(--color-border)",
            width: "fit-content",
            gap: 4,
          }}
          aria-label="Country switcher"
        >
          {countries.map((c) => {
            const isActive = c.code === activeCountry;
            const href = `/${countrySlug(c.code)}`;
            return (
              <Link
                key={c.code}
                href={href}
                className="inline-flex items-center gap-2 transition-all duration-150"
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: isActive ? "var(--color-background-page)" : "transparent",
                  color: isActive
                    ? "var(--color-text-primary)"
                    : "var(--color-text-muted)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: isActive ? "var(--shadow-soft)" : "none",
                }}
              >
                <span
                  aria-hidden
                  className={`${FLAG_CLASS[c.code] ?? ""} inline-block`}
                  style={{
                    width: 20,
                    height: 14,
                    borderRadius: 2,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                {c.name}
              </Link>
            );
          })}
        </nav>

        {/* Right — minimal: Log in + Book */}
        <div className="flex items-center gap-2.5" style={{ justifySelf: "end" }}>
          {!authUser ? (
            <Link
              href="/login"
              className="hidden text-[var(--color-text-body)] hover:text-[var(--color-text-primary)] md:inline-block"
              style={{
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Log in
            </Link>
          ) : (
            <Link
              href={authUser.role === "ADMIN" ? "/admin" : "/account"}
              className="hidden text-[var(--color-text-body)] hover:text-[var(--color-text-primary)] md:inline-block"
              style={{
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {authUser.role === "ADMIN" ? "Admin" : "Account"}
            </Link>
          )}
          <Link
            href="/book-online"
            className="gh-btn gh-btn-primary"
            style={{ minHeight: 44, padding: "0 22px", fontSize: 14 }}
          >
            Book
          </Link>

          {/* Mobile drawer trigger — only on small screens */}
          <div className="md:hidden">
            <MobileNav
              siteName={siteName}
              navigation={navigation}
              brandLogo={brandLogo}
              authUser={authUser}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

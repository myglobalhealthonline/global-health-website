"use client";

/**
 * Sticky public header.
 *
 * Layout (single row, desktop):
 *   • Left:   brand
 *   • Center: when inside a country, section tabs (Home / Doctors / General /
 *             Specialist Consultation). At `/`, no center content — the page
 *             body owns the country picker.
 *   • Right:  CountrySwitcher (compact dropdown, preserves section on swap)
 *             · LanguageSwitcher (only when the active country has >1 locale)
 *             · Log in / Account · Book CTA · mobile drawer trigger.
 *
 * Mobile collapses the section tabs + switchers into the MobileNav drawer.
 *
 * All locale + country options come from `data/countries.ts` and the active
 * country's `supportedLocales` — no hardcoded lists. Adding a locale =
 * extend `LocaleCode` + the country config; this component picks it up.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteNavigationData } from "@/data/navigation";
import type { AuthUser } from "@/lib/api/auth-api";
import { countries, getCountryByCode, type CountryCode } from "@/data/countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import type { LocaleCode } from "@/lib/i18n/types";
import { parseSitePath } from "@/lib/routing/path-rewrites";
import { CountrySwitcher } from "@/components/layout/CountrySwitcher";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { SectionNav, type SectionNavItem } from "@/components/layout/SectionNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { CartIcon } from "@/components/cart/CartIcon";

function sectionNavForCountryLang(
  countrySlug: string,
  lang: string,
  features: string[] | undefined,
): SectionNavItem[] {
  const base = `/${countrySlug}/${lang}`;
  const enabled = (key: string) =>
    !features || features.length === 0 || features.includes(key);

  // Build the Services submenu in admin-configured order. Each child
  // gets a short description for the dropdown body — minimal context
  // since the labels are already specific.
  const servicesChildren: Array<{
    href: string;
    label: string;
    description?: string;
  }> = [];
  if (enabled("general-consultations")) {
    servicesChildren.push({
      href: `${base}/general-consultation`,
      label: "General consultation",
      description: "GP video call · same-day slots",
    });
  }
  if (enabled("specialist-consultations")) {
    servicesChildren.push({
      href: `${base}/specialist-consultation`,
      label: "Specialist consultation",
      description: "Cardiology, dermatology, paediatrics + more",
    });
  }
  if (enabled("online-prescriptions")) {
    servicesChildren.push({
      href: `${base}/prescriptions`,
      label: "Prescription",
      description: "Repeat scripts, sent to your pharmacy",
    });
  }
  if (enabled("health-tests")) {
    servicesChildren.push({
      href: `${base}/tests`,
      label: "Health test",
      description: "Lab-quality kits, delivered home",
    });
  }

  const items: SectionNavItem[] = [
    { href: base, label: "Home", exact: true },
    { href: `${base}/doctors`, label: "Doctors" },
  ];
  if (servicesChildren.length > 0) {
    items.push({ label: "Services", children: servicesChildren });
  }
  // Global pages — country/lang-agnostic.
  items.push({ href: "/about", label: "About" });
  items.push({ href: "/blog", label: "Blog" });
  items.push({ href: "/faq", label: "FAQ" });
  return items;
}

/** Outside-a-country nav: no per-country service links, but About /
 *  Blog / FAQ + a top-level Services pointer that bounces visitors
 *  to the country gate. */
function sectionNavGlobal(): SectionNavItem[] {
  return [
    { href: "/", label: "Home", exact: true },
    { href: "/about", label: "About" },
    { href: "/blog", label: "Blog" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
  ];
}

export function SiteHeader({
  siteName,
  navigation,
  brandLogo,
  authUser,
  /** Per-country feature toggles passed from the server layout. Keyed
   *  by lowercased country code. Used to hide nav tabs for features
   *  the admin has disabled in /admin/country-features. */
  countryFeatures,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  authUser?: AuthUser | null;
  countryFeatures?: Record<string, string[] | undefined>;
}) {
  const pathname = usePathname() || "/";
  const parsed = parseSitePath(pathname);
  const activeCountryCode: CountryCode | null = parsed.country
    ? countryCodeFromSlug(parsed.country)
    : null;
  const activeCountry = activeCountryCode
    ? getCountryByCode(activeCountryCode) ?? null
    : null;
  const activeLang = (parsed.lang ?? activeCountry?.defaultLocale ?? "en") as LocaleCode;

  const activeFeatures = activeCountryCode
    ? countryFeatures?.[activeCountryCode]
    : undefined;
  const sectionItems: SectionNavItem[] =
    activeCountry && parsed.country && parsed.lang
      ? sectionNavForCountryLang(parsed.country, parsed.lang, activeFeatures)
      : sectionNavGlobal();

  // Cart-first booking: the header "Book" CTA points at the country's
  // general consultation catalogue so visitors pick a service first
  // (the legacy /book-online form still exists as a fallback). Outside
  // a country we drop them on the global landing — the country gate
  // resolves before they can pick a service.
  const bookHref =
    activeCountry && parsed.lang
      ? `/${COUNTRY_CODE_TO_SLUG[activeCountry.code]}/${parsed.lang}/general-consultation`
      : "/";

  return (
    <header className="gh-header-sticky w-full">
      <div
        className="
          mx-auto grid items-center
          max-w-[1320px]
          px-5 md:px-10 py-3.5
          grid-cols-[auto_1fr_auto]
          gap-6
        "
      >
        {/* Brand */}
        <Link
          href={activeCountry && parsed.lang ? `/${parsed.country}/${parsed.lang}` : "/"}
          className="inline-flex items-center"
          style={{ textDecoration: "none" }}
          aria-label={siteName || "Global Health"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandLogo?.src ?? "/logos/global-health-light.png"}
            alt={brandLogo?.alt ?? siteName ?? "Global Health"}
            className="h-11 w-auto"
          />
        </Link>

        {/* Section tabs — only inside a country */}
        <div className="hidden md:flex" style={{ justifySelf: "center" }}>
          {sectionItems.length > 0 ? <SectionNav items={sectionItems} variant="dark" /> : null}
        </div>

        {/* Right — switchers + auth + CTA */}
        <div
          className="flex items-center gap-2.5"
          style={{ justifySelf: "end" }}
        >
          <div className="hidden md:flex md:items-center md:gap-2">
            <CountrySwitcher activeCountryCode={activeCountryCode} />
            {activeCountry ? (
              <LanguageSwitcher
                currentLang={activeLang}
                availableLocales={activeCountry.supportedLocales}
              />
            ) : null}
          </div>

          <CartIcon />

          {!authUser ? (
            <Link
              href="/login"
              className="hidden text-[length:var(--text-meta)] font-semibold no-underline text-white/70 hover:text-white md:inline-block"
            >
              Log in
            </Link>
          ) : (
            <Link
              href={authUser.role === "ADMIN" ? "/admin" : "/account"}
              className="hidden text-[length:var(--text-meta)] font-semibold no-underline text-white/70 hover:text-white md:inline-block"
            >
              {authUser.role === "ADMIN" ? "Admin" : "Account"}
            </Link>
          )}

          <Link
            href={bookHref}
            className="gh-btn gh-btn-ghost-dark hidden md:inline-flex"
            style={{ minHeight: 44, padding: "0 22px" }}
          >
            Book
          </Link>

          {/* Mobile drawer trigger */}
          <div className="md:hidden">
            <MobileNav
              siteName={siteName}
              navigation={navigation}
              brandLogo={brandLogo}
              authUser={authUser}
              countryFeatures={countryFeatures}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

// `countries` is intentionally imported to keep the country list type-checked
// against `data/countries.ts` even though the switcher reads it directly.
void countries;

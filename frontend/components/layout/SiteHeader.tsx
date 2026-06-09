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
import { type CountryCode, type CountryConfig } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import type { LocaleCode } from "@/lib/i18n/types";
import { parseSitePath } from "@/lib/routing/path-rewrites";
import { buildBookHref } from "@/lib/routing/book-href";
import { rememberCountry, useLastCountry } from "@/lib/routing/last-country";
import { useEffect } from "react";
import { CountrySwitcher } from "@/components/layout/CountrySwitcher";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { SectionNav, type SectionNavItem } from "@/components/layout/SectionNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { CartIcon } from "@/components/cart/CartIcon";
import { ArrowUpRight } from "lucide-react";

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
      href: `${base}/gp-appointment`,
      label: "Book a GP Appointment",
      description: "General practitioners registered in your country",
    });
  }
  if (enabled("specialist-consultations")) {
    servicesChildren.push({
      href: `${base}/see-a-specialist`,
      label: "See a Specialist",
      description: "Cardiology, dermatology, paediatrics + more",
    });
  }
  if (enabled("online-prescriptions")) {
    servicesChildren.push({
      href: `${base}/repeat-prescription-request`,
      label: "Repeat Prescription Request",
      description: "Reviewed by licensed doctors, sent to your pharmacy",
    });
  }
  if (enabled("health-tests")) {
    servicesChildren.push({
      href: `${base}/lab-tests`,
      label: "Lab Test Booking",
      description: "Lab-quality kits reviewed by our doctors",
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
  items.push({ href: "/blog", label: "Blog" });
  items.push({ href: "/about", label: "About" });
  items.push({ href: "/contact", label: "Contact" });
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
  countryFeatures,
  initialLastCountry,
  countries,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  authUser?: AuthUser | null;
  countryFeatures?: Record<string, string[] | undefined>;
  initialLastCountry?: { slug: string; lang: string } | null;
  countries: CountryConfig[];
}) {
  const pathname = usePathname() || "/";
  const parsed = parseSitePath(pathname);

  // Country resolution priority:
  // 1) URL segment (`/[country]/[lang]/...`) — authoritative when set
  // 2) Last-country cookie — kicks in on global pages (/about, /blog,
  //    /faq, /contact, /) so the switchers don't reset to "Choose
  //    country" after a visitor has already picked one.
  const lastCountry = useLastCountry(initialLastCountry);

  const urlCountryCode: CountryCode | null = parsed.country
    ? countryCodeFromSlug(parsed.country)
    : null;
  const activeCountryCode: CountryCode | null =
    urlCountryCode ?? lastCountry?.code ?? null;

  const activeCountry = activeCountryCode
    ? (countries.find((c) => c.code === activeCountryCode) ?? null)
    : null;

  // Lang: URL > cookie > active country's default > "en".
  const activeLang = (
    parsed.lang ??
    (urlCountryCode ? null : lastCountry?.lang) ??
    activeCountry?.defaultLocale ??
    "en"
  ) as LocaleCode;

  // Refresh the last-country cookie whenever the URL has a real
  // country segment. Stale cookies get overwritten; first-time visitors
  // populate it as soon as they cross the country gate.
  useEffect(() => {
    if (parsed.country && parsed.lang) {
      rememberCountry(parsed.country, parsed.lang);
    }
  }, [parsed.country, parsed.lang]);

  const activeFeatures = activeCountryCode
    ? countryFeatures?.[activeCountryCode]
    : undefined;

  // Section nav: prefer the in-country IA when we have a country
  // context AT ALL (URL or cookie). Only show the global IA when the
  // visitor has truly never picked a country yet.
  const effectiveCountrySlug = parsed.country ?? lastCountry?.slug ?? null;
  const effectiveLang = parsed.lang ?? lastCountry?.lang ?? null;
  const sectionItems: SectionNavItem[] =
    activeCountry && effectiveCountrySlug && effectiveLang
      ? sectionNavForCountryLang(effectiveCountrySlug, effectiveLang, activeFeatures)
      : sectionNavGlobal();

  // Cart-first booking: the header "Book" CTA opens the guided /book page
  // (service → doctor → time → details in one flow). Outside a country we
  // drop them on the global landing — the country gate resolves before
  // they can book.
  const bookHref =
    activeCountry && effectiveCountrySlug && activeLang
      ? buildBookHref({ country: effectiveCountrySlug, lang: activeLang })
      : "/";

  return (
    <header className="gh-header-sticky w-full">
      <div
        className="
          mx-auto grid items-center
          max-w-[1320px]
          px-5 md:px-10 py-3
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
            src={brandLogo?.src ?? "/logos/global-health-dark.png"}
            alt={brandLogo?.alt ?? siteName ?? "Global Health"}
            className="h-10 w-auto"
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
            <CountrySwitcher activeCountryCode={activeCountryCode} countries={countries} />
            {activeCountry ? (
              <LanguageSwitcher
                currentLang={activeLang}
                availableLocales={activeCountry.supportedLocales}
                fallbackCountrySlug={
                  parsed.country ?? lastCountry?.slug ?? undefined
                }
              />
            ) : null}
          </div>

          <CartIcon variant="dark" />

          {!authUser ? (
            <Link
              href="/login"
              className="hidden rounded-full px-2 text-sm font-semibold text-white/70 transition-colors hover:text-white active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:inline-flex"
              style={{ minHeight: 44, alignItems: "center", textDecoration: "none" }}
            >
              Log in
            </Link>
          ) : (
            <Link
              href={authUser.role === "ADMIN" ? "/admin" : "/account"}
              className="hidden rounded-full px-2 text-sm font-semibold text-white/70 transition-colors hover:text-white active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:inline-flex"
              style={{ minHeight: 44, alignItems: "center", textDecoration: "none" }}
            >
              {authUser.role === "ADMIN" ? "Admin" : "Account"}
            </Link>
          )}

          {/* Primary CTA. White pill, forest ink, lime arrow accent (lime is
              accent-only, never a fill). Tactile: lifts on hover, pushes on
              active. */}
          <Link
            href={bookHref}
            aria-label="Book an appointment"
            className="group hidden items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-accent)] pl-5 pr-4 py-3 text-sm font-bold text-[var(--color-brand-primary)] shadow-[0_2px_8px_rgba(15,46,37,0.18)] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(15,46,37,0.32)] active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background-dark)] md:inline-flex"
            style={{ minHeight: 44, textDecoration: "none" }}
          >
            Book Appointment
            <ArrowUpRight
              className="size-4 text-[var(--color-brand-primary)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              strokeWidth={2.5}
              aria-hidden
            />
          </Link>

          <Link
            href={bookHref}
            aria-label="Book an appointment"
            className="inline-flex items-center justify-center gap-1 rounded-full bg-[var(--color-brand-accent)] px-4 py-2.5 text-sm font-bold text-[var(--color-brand-primary)] shadow-[0_2px_8px_rgba(15,46,37,0.18)] transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background-dark)] md:hidden"
            style={{ minHeight: 40, textDecoration: "none" }}
          >
            Book
            <ArrowUpRight className="size-3.5 text-[var(--color-brand-primary)]" strokeWidth={2.5} aria-hidden />
          </Link>

          {/* Mobile drawer trigger */}
          <div className="md:hidden">
            <MobileNav
              siteName={siteName}
              navigation={navigation}
              brandLogo={brandLogo}
              authUser={authUser}
              countryFeatures={countryFeatures}
              bookHref={bookHref}
              countries={countries}
            />
          </div>
        </div>
      </div>
    </header>
  );
}


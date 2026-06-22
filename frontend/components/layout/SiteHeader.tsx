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
import { type CountryCode, type CountryConfig } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";
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
  nav: SiteNavigationData,
): SectionNavItem[] {
  const base = `/${countrySlug}/${lang}`;
  const enabled = (key: string) =>
    !features || features.length === 0 || features.includes(key);

  const servicesChildren: Array<{
    href: string;
    label: string;
    description?: string;
  }> = [];
  if (enabled("general-consultations")) {
    servicesChildren.push({
      href: `${base}/gp-appointment`,
      label: nav.navBookGp,
      description: nav.navBookGpDesc,
    });
  }
  if (enabled("specialist-consultations")) {
    servicesChildren.push({
      href: `${base}/see-a-specialist`,
      label: nav.navSeeSpecialist,
      description: nav.navSeeSpecialistDesc,
    });
  }
  if (enabled("online-prescriptions")) {
    servicesChildren.push({
      href: `${base}/repeat-prescription-request`,
      label: nav.navRepeatPrescription,
      description: nav.navRepeatPrescriptionDesc,
    });
  }
  if (enabled("health-tests")) {
    servicesChildren.push({
      href: `${base}/lab-tests`,
      label: nav.navLabTests,
      description: nav.navLabTestsDesc,
    });
  }

  const items: SectionNavItem[] = [
    { href: base, label: nav.navHome, exact: true },
    { href: `${base}/doctors`, label: nav.navDoctors },
  ];
  if (servicesChildren.length > 0) {
    items.push({ label: nav.navServices, children: servicesChildren });
  }
  // Strict opt-in (not the loose `enabled`): only show Plans where the country
  // explicitly enabled subscriptions, else the link would 404 (§36.15).
  if (features?.includes("subscriptions")) {
    items.push({ href: `${base}/pricing`, label: nav.navPlans });
  }
  items.push({ href: "/blog", label: nav.navBlog });
  items.push({ href: "/about", label: nav.navAbout });
  items.push({ href: "/contact", label: nav.navContact });
  return items;
}

/** Outside-a-country nav: no per-country service links. */
function sectionNavGlobal(nav: SiteNavigationData): SectionNavItem[] {
  return [
    { href: "/", label: nav.navHome, exact: true },
    { href: "/about", label: nav.navAbout },
    { href: "/blog", label: nav.navBlog },
    { href: "/faq", label: nav.navFaq },
    { href: "/contact", label: nav.navContact },
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
  currentLocale,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  authUser?: { role: string } | null;
  countryFeatures?: Record<string, string[] | undefined>;
  initialLastCountry?: { slug: string; lang: string } | null;
  countries: CountryConfig[];
  /** Locale the server rendered this request in (URL > cookie > Accept-Language). */
  currentLocale?: LocaleCode;
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

  // Lang: URL > server-resolved locale (gh_locale cookie / Accept-Language)
  // > last-country cookie > active country's default > "en". The server
  // locale keeps the switcher in sync with what the page actually rendered
  // in on global pages (/about, /blog) where there's no [lang] segment.
  const activeLang = (
    parsed.lang ??
    (urlCountryCode ? null : (currentLocale ?? lastCountry?.lang)) ??
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
      ? sectionNavForCountryLang(effectiveCountrySlug, effectiveLang, activeFeatures, navigation)
      : sectionNavGlobal(navigation);

  // Cart-first booking: the header "Book" CTA opens the guided /book page
  // (service → doctor → time → details in one flow). Outside a country we
  // drop them on the global landing — the country gate resolves before
  // they can book.
  const bookHref =
    activeCountry && effectiveCountrySlug && activeLang
      ? buildBookHref({ country: effectiveCountrySlug, lang: activeLang })
      : "/";

  return (
    <header className="gh-site-shell gh-header-sticky w-full">
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
          className="gh-header-brandLink inline-flex items-center"
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
        <div className="gh-header-navCenter hidden md:flex">
          {sectionItems.length > 0 ? <SectionNav items={sectionItems} variant="dark" /> : null}
        </div>

        {/* Right — switchers + auth + CTA */}
        <div className="gh-header-actions flex items-center gap-2.5">
          <div className="hidden md:flex md:items-center md:gap-2">
            <CountrySwitcher activeCountryCode={activeCountryCode} countries={countries} />
            <LanguageSwitcher
              currentLang={activeLang}
              availableLocales={
                activeCountry?.supportedLocales ?? [...supportedLocaleCodes]
              }
              fallbackCountrySlug={parsed.country ?? lastCountry?.slug ?? undefined}
            />
          </div>

          <CartIcon variant="dark" />

          {!authUser ? (
            <Link
              href="/login"
              className="gh-header-authLink hidden rounded-full px-2 text-sm font-semibold text-white/70 transition-colors hover:text-white active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:inline-flex"
            >
              {navigation.headerAuthLink.label}
            </Link>
          ) : (
            <Link
              href={authUser.role === "ADMIN" ? "/admin" : "/account"}
              className="gh-header-authLink hidden rounded-full px-2 text-sm font-semibold text-white/70 transition-colors hover:text-white active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 md:inline-flex"
            >
              {authUser.role === "ADMIN" ? "Admin" : "Account"}
            </Link>
          )}

          {/* Primary CTA — gh2 lime pill: dark ink, lime glow, lift on
              hover, push on active. Mirrors the hero's gh2-btn-lime. */}
          <Link
            href={bookHref}
            aria-label="Book an appointment"
            className="gh-header-bookCta group hidden items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-accent)] pl-5 pr-4 py-3 text-sm font-extrabold tracking-[-0.01em] text-[#0a1f14] shadow-[0_4px_16px_rgba(176,241,34,0.22)] transition-[transform,box-shadow,filter] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_10px_30px_rgba(176,241,34,0.32)] active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background-dark)] md:inline-flex"
          >
            {navigation.navBookAppointment}
            <ArrowUpRight
              className="size-4 text-[#0a1f14] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              strokeWidth={2.5}
              aria-hidden
            />
          </Link>

          <Link
            href={bookHref}
            aria-label="Book an appointment"
            className="gh-header-bookCtaMobile inline-flex items-center justify-center gap-1 rounded-full bg-[var(--color-brand-accent)] px-4 py-2.5 text-sm font-extrabold tracking-[-0.01em] text-[#0a1f14] shadow-[0_4px_16px_rgba(176,241,34,0.22)] transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background-dark)] md:hidden"
          >
            {navigation.navBookShort}
            <ArrowUpRight className="size-3.5 text-[#0a1f14]" strokeWidth={2.5} aria-hidden />
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


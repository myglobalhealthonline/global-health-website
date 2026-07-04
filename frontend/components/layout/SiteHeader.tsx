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
import { useEffect, useState } from "react";
import { CountrySwitcher } from "@/components/layout/CountrySwitcher";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { SectionNav, type SectionNavItem } from "@/components/layout/SectionNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { CartIcon } from "@/components/cart/CartIcon";
import { ArrowUpRight, Bell } from "lucide-react";

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

/** First letter of the user's email, uppercased — the avatar glyph.
 *  Falls back to a neutral dot when no email is available. */
function initialFromEmail(email?: string | null): string {
  const ch = email?.trim()?.[0];
  return ch ? ch.toUpperCase() : "•";
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
  authUser?: { role: string; email?: string | null } | null;
  countryFeatures?: Record<string, string[] | undefined>;
  initialLastCountry?: { slug: string; lang: string } | null;
  countries: CountryConfig[];
  /** Locale the server rendered this request in (URL > cookie > Accept-Language). */
  currentLocale?: LocaleCode;
}) {
  const pathname = usePathname() || "/";
  const parsed = parseSitePath(pathname);

  // Scroll-reactive chrome: a full-width bar at the very top that
  // condenses into a floating rounded pill once the page scrolls.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let ticking = false;
    const apply = () => {
      setScrolled(window.scrollY > 20);
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
      <div
        className="mx-auto w-full px-3 md:px-4"
        style={{ paddingBlock: 10 }}
      >
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
        {/* Brand */}
        <Link
          href={activeCountry && parsed.lang ? `/${parsed.country}/${parsed.lang}` : "/"}
          className="gh-header-brandLink inline-flex shrink-0 min-w-max items-center"
          aria-label={siteName || "Global Health"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandLogo?.src ?? "/logos/global-health-dark.png"}
            alt={brandLogo?.alt ?? siteName ?? "Global Health"}
            className="h-12 w-auto md:h-14"
          />
        </Link>

        {/* Section tabs — only inside a country. Desktop-only (lg+); tablet
            and below collapse into the MobileNav drawer. */}
        <nav aria-label="Sections" className="gh-header-navCenter hidden min-w-0 justify-center xl:flex">
          {sectionItems.length > 0 ? <SectionNav items={sectionItems} variant="dark" /> : null}
        </nav>

        {/* Right — switchers + auth + CTA */}
        <div className="gh-header-actions flex items-center gap-2.5">
          <div className="hidden xl:flex xl:items-center xl:gap-2">
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

          {/* Notifications — links to the account inbox (or sign-in). The
              lime dot is the signature live-status accent. */}
          <Link
            href={authUser ? "/account/notifications" : "/login"}
            aria-label="Notifications"
            className="gh-focus-on-dark relative hidden size-11 items-center justify-center rounded-full text-white/85 transition-colors duration-200 hover:bg-white/12 hover:text-white xl:inline-flex"
          >
            <Bell className="size-4" strokeWidth={2} aria-hidden />
            <span
              aria-hidden
              className="absolute right-2.5 top-2.5 size-2 rounded-full ring-2 ring-[color:var(--color-background-dark)]"
              style={{ background: "var(--color-brand-accent)" }}
            />
          </Link>

          {!authUser ? (
            <Link
              href="/login"
              className="gh-header-authLink gh-focus-on-dark hidden whitespace-nowrap rounded-full px-2 text-sm font-semibold text-white/70 transition-colors hover:text-white active:opacity-80 xl:inline-flex"
            >
              {navigation.headerAuthLink.label}
            </Link>
          ) : (
            <Link
              href={
                authUser.role === "ADMIN"
                  ? "/admin"
                  : authUser.role === "DOCTOR"
                    ? "/doctor"
                    : "/account"
              }
              aria-label={
                authUser.email
                  ? `Your account (${authUser.email})`
                  : "Your account"
              }
              title={authUser.email ?? undefined}
              className="gh-focus-on-dark group hidden size-11 items-center justify-center rounded-full transition-transform duration-200 active:scale-95 xl:inline-flex"
            >
              {/* 44px hit area; 36px visual circle so the tight lg header row
                  keeps its previous width. */}
              <span className="inline-flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[13px] font-extrabold leading-none text-white transition-[background-color,border-color] duration-200 group-hover:border-[var(--color-brand-accent)] group-hover:bg-white/[0.16]">
                {initialFromEmail(authUser.email)}
              </span>
            </Link>
          )}

          {/* Primary CTA — gh2 lime pill: dark ink, lime glow, lift on
              hover, push on active. Mirrors the hero's gh2-btn-lime. */}
          <Link
            href={bookHref}
            aria-label="Book an appointment"
            className="gh-header-bookCta gh-focus-on-dark group hidden min-h-12 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--color-brand-accent)] pl-5 pr-4 py-3 text-sm font-extrabold tracking-[-0.01em] text-[#0a1f14] shadow-[0_4px_16px_rgba(176,241,34,0.22)] transition-[transform,box-shadow,filter] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_10px_30px_rgba(176,241,34,0.32)] active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 xl:inline-flex"
          >
            {navigation.navBookAppointment}
            <ArrowUpRight
              className="size-4 text-[#0a1f14] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
              strokeWidth={2.5}
              aria-hidden
            />
          </Link>

          {/* Below xl, booking is reached via the drawer's own sticky Book
              CTA (see MobileNav) — no duplicate pill in the header bar. */}

          {/* Mobile + tablet drawer trigger — shown below xl (incl. iPad). */}
          <div className="xl:hidden">
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
      </div>
    </header>
  );
}


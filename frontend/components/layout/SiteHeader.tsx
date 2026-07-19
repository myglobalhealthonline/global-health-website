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
 *
 * Server Component: the owning (site)/layout.tsx resolves the request
 * pathname (`x-gh-pathname`) and the remembered-country cookie server-side
 * and passes them in as props, so this file needs no `usePathname()` /
 * client state of its own. The two genuinely client-only bits — the
 * scroll-triggered glass toggle and the last-country cookie refresh — live
 * in HeaderScrollShell and RememberCountryOnMount respectively.
 */

import Link from "next/link";
import Image from "next/image";
import type { SiteNavigationData } from "@/data/navigation";
import { type CountryCode, type CountryConfig } from "@/data/countries";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";
import type { ParsedSitePath } from "@/lib/routing/path-rewrites";
import { buildBookHref } from "@/lib/routing/book-href";
import { CountrySwitcher } from "@/components/layout/CountrySwitcher";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { SectionNav, type SectionNavItem } from "@/components/layout/SectionNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { CartIcon } from "@/components/cart/CartIcon";
import { HeaderScrollShell } from "@/components/layout/HeaderScrollShell";
import { RememberCountryOnMount } from "@/components/layout/RememberCountryOnMount";
import { HeaderAuthActions } from "@/components/layout/HeaderAuthActions";
import { isUnoptimizedImageSrc } from "@/lib/content/asset-media-url";
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
      href: `${base}/gp-consultation-online`,
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
  items.push({ href: `${base}/blog`, label: nav.navBlog });
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
  countryFeatures,
  initialLastCountry,
  countries,
  currentLocale,
  parsed,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  countryFeatures?: Record<string, string[] | undefined>;
  initialLastCountry?: { slug: string; lang: string } | null;
  countries: CountryConfig[];
  /** Locale the server rendered this request in (URL > cookie > Accept-Language). */
  currentLocale?: LocaleCode;
  /** Request pathname, parsed server-side (from `x-gh-pathname`). */
  parsed: ParsedSitePath;
}) {
  // Country resolution priority:
  // 1) URL segment (`/[country]/[lang]/...`) — authoritative when set
  // 2) Last-country cookie (read server-side by the layout) — kicks in on
  //    global pages (/about, /blog, /faq, /contact, /) so the switchers
  //    don't reset to "Choose country" after a visitor has already picked
  //    one.
  const lastCountryCode = initialLastCountry
    ? countryCodeFromSlug(initialLastCountry.slug)
    : null;
  const lastCountry =
    initialLastCountry && lastCountryCode
      ? { code: lastCountryCode, slug: initialLastCountry.slug, lang: initialLastCountry.lang }
      : null;

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
    <HeaderScrollShell>
      <RememberCountryOnMount country={parsed.country} lang={parsed.lang} />
      {/* Brand */}
      <Link
        href={activeCountry && parsed.lang ? `/${parsed.country}/${parsed.lang}` : "/"}
        className="gh-header-brandLink inline-flex shrink-0 min-w-max items-center"
        aria-label={siteName || "Global Health"}
      >
        {/* width/height match the rendered size (h-12 md:h-14 → 56px tall,
            width auto) so the optimizer serves a ~172px 2x variant instead
            of the 828px one the old 404×272 props requested. */}
        <Image
          src={brandLogo?.src ?? "/logos/global-health-dark.png"}
          alt={brandLogo?.alt ?? siteName ?? "Global Health"}
          width={86}
          height={56}
          priority
          className="h-12 w-auto md:h-14"
          unoptimized={isUnoptimizedImageSrc(brandLogo?.src ?? "")}
        />
      </Link>

      {/* Section tabs — full set at xl+ only; below that the drawer
          (hamburger) is the sole nav, no partial in-between row. */}
      <nav aria-label="Sections" className="gh-header-navCenter hidden min-w-0 justify-center xl:flex">
        {sectionItems.length > 0 ? <SectionNav items={sectionItems} variant="dark" /> : null}
      </nav>

      {/* Right — switchers + auth + CTA */}
      <div className="gh-header-actions flex items-center gap-2.5">
        <div className="hidden xl:flex xl:items-center xl:gap-2">
          <CountrySwitcher
            activeCountryCode={activeCountryCode}
            countries={countries}
            chooseCountryLabel={navigation.navChooseCountry}
            switchConfirmTemplate={navigation.navCountrySwitchConfirmTemplate}
            itemSingular={navigation.navCartItemSingular}
            itemPlural={navigation.navCartItemPlural}
          />
          <LanguageSwitcher
            currentLang={activeLang}
            availableLocales={
              activeCountry?.supportedLocales ?? [...supportedLocaleCodes]
            }
            fallbackCountrySlug={parsed.country ?? lastCountry?.slug ?? undefined}
          />
        </div>

        <CartIcon variant="dark" />

        {/* Notification bell + login/avatar — personalized from the
            client-fetched session (see HeaderAuthActions/PublicAuthContext),
            not a header/cookie read here, so this Server Component stays
            static-friendly (P-001). */}
        <HeaderAuthActions navigation={navigation} />

        {/* Primary CTA — gh2 lime pill: dark ink, lime glow, lift on
            hover, push on active. Mirrors the hero's gh2-btn-lime. */}
        <Link
          href={bookHref}
          aria-label="Book an appointment"
          className="gh-header-bookCta gh-focus-on-dark group hidden min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--color-brand-accent)] pl-5 pr-4 py-3 text-sm font-extrabold tracking-[-0.01em] text-[#0a1f14] shadow-[0_4px_16px_rgba(176,241,34,0.22)] transition-[transform,box-shadow,filter] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_10px_30px_rgba(176,241,34,0.32)] active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:inline-flex"
        >
          {navigation.navBookAppointment}
          <ArrowUpRight
            className="size-4 text-[#0a1f14] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none"
            strokeWidth={2.5}
            aria-hidden
          />
        </Link>

        {/* Below lg, booking is reached via the drawer's own sticky Book
            CTA (see MobileNav) — no duplicate pill in the header bar. */}

        {/* Mobile + tablet drawer trigger — shown below xl (incl. iPad). */}
        <div className="xl:hidden">
          <MobileNav
            siteName={siteName}
            navigation={navigation}
            brandLogo={brandLogo}
            countryFeatures={countryFeatures}
            bookHref={bookHref}
            countries={countries}
            lastCountry={lastCountry}
          />
        </div>
      </div>
    </HeaderScrollShell>
  );
}

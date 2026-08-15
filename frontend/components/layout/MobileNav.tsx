"use client";

/**
 * Mobile drawer for the public header.
 *
 * Contents (in order):
 *   1. Section links for the active country (Home / Doctors / General /
 *      Specialist Consultation) — hidden at `/`.
 *   2. Country list — full set, with current country marked. Tapping a country
 *      preserves the current section via `swapCountryInPath`.
 *   3. Language list — only when the active country has >1 locale.
 *   4. Log in / Account.
 *   5. Sticky Book CTA at the bottom.
 *
 * All data comes from `data/countries.ts` + the active country's
 * `supportedLocales`. No Wix-era ClinicsDropdown / AboutDropdown content
 * remains here.
 */

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, User, X, Check, Languages } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteNavigationData } from "@/data/navigation";
import { DEFAULT_BRAND_LOGO } from "@/lib/content/brand-logo";
import type { CountryConfig, CountryCode } from "@/data/countries";
import {
  COUNTRY_CODE_TO_SLUG,
  countryCodeFromSlug,
} from "@/lib/routing/country-slug";
import {
  parseSitePath,
  swapCountryInPath,
  swapLangInPath,
} from "@/lib/routing/path-rewrites";
import { localeDisplayName } from "@/lib/i18n/locale-display";
import { Flag } from "@/components/ui/Flag";
import { setClientLocaleCookie } from "@/lib/i18n/get-client-locale";
import { countryLinkLocale } from "@/lib/i18n/country-link-locale";
import { usePublicAuth } from "@/components/layout/PublicAuthContext";

export function MobileNav({
  siteName,
  navigation,
  brandLogo = DEFAULT_BRAND_LOGO,
  countryFeatures,
  bookHref,
  countries,
  lastCountry,
  selectedLocale,
  toolLinks = [],
  a11y,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  countryFeatures?: Record<string, string[] | undefined>;
  bookHref: string;
  countries: CountryConfig[];
  /** Remembered country (server-read gh-last-country cookie) so the drawer
   *  keeps the in-country IA on global pages — mirrors SiteHeader. */
  lastCountry?: { code: CountryCode; slug: string; lang: string } | null;
  /** The language this visitor chose (SiteHeader's `activeLang`). Decides the
   *  `[lang]` of country links — the remembered cookie's `lang` records where
   *  they've been, not what they picked. */
  selectedLocale?: string | null;
  /** Free-calculator links, resolved server-side by SiteHeader (see above). */
  toolLinks?: Array<{ href: string; label: string }>;
  /** Localized drawer a11y strings, resolved server-side by SiteHeader. */
  a11y: { openMenu: string; menuDescription: string; chooseLanguage: string };
}) {
  // P-001: read from the client-fetched session instead of a server prop
  // sourced from headers() — see PublicAuthContext.tsx.
  const { user: authUser, loading: authLoading } = usePublicAuth();
  const pathname = usePathname() || "/";
  const parsed = parseSitePath(pathname);
  // Country context: URL segment first, else the remembered last-country.
  // Without the cookie fallback the drawer dropped Doctors / Services /
  // Plans on global pages (/about, /blog, /contact) even after the visitor
  // had picked a country — the desktop SectionNav already uses this fallback.
  const activeCountryCode =
    (parsed.country ? countryCodeFromSlug(parsed.country) : null) ??
    lastCountry?.code ??
    null;
  const navCountrySlug = parsed.country ?? lastCountry?.slug ?? null;
  const navLang = parsed.lang ?? selectedLocale ?? lastCountry?.lang ?? null;

  // Country/language switches HARD-navigate (window.location.href) and sync
  // the gh_locale cookie. Client-side nav (<Link>) preserves the shared
  // (site)/layout.tsx, leaving the navbar/footer in the previous language;
  // a stale cookie leaks the old language back into global pages.
  function switchTo(href: string, nextLang: string | null) {
    if (nextLang) {
      setClientLocaleCookie(nextLang);
    }
    globalThis.location.assign(href);
  }
  const activeCountry = activeCountryCode ? (countries.find((c) => c.code === activeCountryCode) ?? null) : null;
  const activeLang = navLang ?? activeCountry?.defaultLocale ?? null;

  const portalHref = authUser?.role === "ADMIN" ? "/admin" : "/account";
  const portalLabel = authUser?.role === "ADMIN" ? navigation.navAdminPortal : navigation.navAccountPortal;

  // Union across all markets when there's no active country (first-ever
  // visit, or any client without the gh-last-country cookie — every
  // crawler): a flag that's off in EVERY market must not fail open into a
  // guaranteed-dead link. Mirrors the identical fix in SiteHeader/SiteFooter.
  const activeFeatures = activeCountryCode
    ? countryFeatures?.[activeCountryCode]
    : countryFeatures
      ? [...new Set(Object.values(countryFeatures).flatMap((f) => f ?? []))]
      : undefined;
  const isFeatureOn = (key: string) =>
    !activeFeatures || activeFeatures.length === 0 || activeFeatures.includes(key);

  // Mirror the desktop SiteHeader IA: Home / Doctors / [Services...] /
  // About / Blog / FAQ. Services expand inline on mobile (no nested
  // dropdown — taps go straight to the destination).
  const sectionLinks =
    activeCountry && navCountrySlug && navLang
      ? [
          { href: `/${navCountrySlug}/${navLang}`, label: navigation.navHome },
          { href: `/${navCountrySlug}/${navLang}/doctors`, label: navigation.navDoctors },
          ...(isFeatureOn("general-consultations")
            ? [
                {
                  href: `/${navCountrySlug}/${navLang}/gp-consultation-online`,
                  label: navigation.navBookGp,
                },
              ]
            : []),
          ...(isFeatureOn("specialist-consultations")
            ? [
                {
                  href: `/${navCountrySlug}/${navLang}/see-a-specialist`,
                  label: navigation.navSeeSpecialist,
                },
              ]
            : []),
          ...(isFeatureOn("online-prescriptions")
            ? [
                {
                  href: `/${navCountrySlug}/${navLang}/repeat-prescription-request`,
                  label: navigation.navRepeatPrescription,
                },
              ]
            : []),
          ...(isFeatureOn("health-tests")
            ? [
                {
                  href: `/${navCountrySlug}/${navLang}/lab-tests`,
                  label: navigation.navLabTests,
                },
              ]
            : []),
          // Strict opt-in: only where subscriptions is explicitly enabled (§36.15).
          ...(activeFeatures?.includes("subscriptions")
            ? [
                {
                  href: `/${navCountrySlug}/${navLang}/pricing`,
                  label: navigation.navPlans,
                },
              ]
            : []),
          // Free calculators, resolved server-side and passed in: this is a
          // client component, and importing the tool registry here would drag
          // all six locale bundles into the browser.
          ...toolLinks,
          { href: `/${navCountrySlug}/${navLang}/blog`, label: navigation.navBlog },
          // Country-scoped, matching SiteHeader/SiteFooter.
          { href: `/${navCountrySlug}/${navLang}/about`, label: navigation.navAbout },
          { href: `/${navCountrySlug}/${navLang}/contact`, label: navigation.navContact },
        ]
      : [
          { href: "/", label: navigation.navHome },
          // Ireland-scoped: the bare /about, /blog and /faq were retired on
          // 2026-08-15 and 301 here. Mirrors SiteHeader's sectionNavGlobal.
          { href: "/ireland/en/about", label: navigation.navAbout },
          { href: "/ireland/en/blog", label: navigation.navBlog },
          { href: "/ireland/en/faq", label: navigation.navFaq },
          { href: "/contact", label: navigation.navContact },
        ];

  // Cart-first booking: mobile "Book" opens the guided /book page. With no
  // country context yet we drop to the entry gate ("/") so the user picks a
  // country first. Mirrors the desktop SiteHeader `bookHref` fallback.
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="gh-focus-on-dark inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white/85 transition-colors duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white xl:hidden"
          aria-label={a11y.openMenu}
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-drawer-overlay)] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-[var(--z-drawer)] flex max-h-[100dvh] flex-col bg-white shadow-[var(--shadow-elevated)] xl:hidden">
          {/* Was `{navigation.navHome} navigation` — a localized label glued
              to a hardcoded English noun, which read as half-translated to a
              screen reader on every non-en page. */}
          <Dialog.Title className="sr-only">{a11y.openMenu}</Dialog.Title>
          <Dialog.Description className="sr-only">{a11y.menuDescription}</Dialog.Description>

          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
            <Link href="/" className="flex items-center" aria-label={`${siteName} ${navigation.navHome}`}>
              <Image
                src={DEFAULT_BRAND_LOGO.src}
                alt={brandLogo.alt}
                width={86}
                height={56}
                className="h-12 w-auto max-w-[200px]"
              />
            </Link>
            <Dialog.Close className="inline-flex size-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-white p-3 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2">
              <span className="sr-only">{navigation.navCloseMenu}</span>
              <X className="size-5 text-[var(--color-text-primary)]" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="grow overflow-y-auto px-5 py-5 pb-28">
            {sectionLinks.length > 0 ? (
              <section className="mb-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                  {activeCountry?.name ? `${activeCountry.name} clinic` : "Clinic"}
                </p>
                <ul className="flex flex-col gap-1">
                  {sectionLinks.map((item) => (
                    <li key={item.href}>
                      <Dialog.Close asChild>
                        <Link
                          href={item.href}
                          className="flex min-h-[44px] items-center rounded-[14px] px-3 py-3.5 text-[17px] font-medium leading-snug text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                        >
                          {item.label}
                        </Link>
                      </Dialog.Close>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="mb-6">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                {navigation.navChooseCountry}
              </p>
              <ul className="flex flex-col gap-1">
                {countries.map((c) => {
                  const isActive = c.code === activeCountryCode;
                  // Same fallback chain as SiteFooter.tsx clinicsLinks: prefer
                  // the slug on the country data itself, then the registry,
                  // then the code — avoids `/undefined/<lang>` hrefs when the
                  // client-side slug registry proxy isn't warm yet.
                  const slug =
                    c.slug || COUNTRY_CODE_TO_SLUG[c.code] || c.code.toLowerCase();
                  // The visitor's SELECTED language when the target country
                  // serves it; otherwise the target's default. Same rule as the
                  // desktop switcher — see lib/i18n/country-link-locale.ts.
                  const nextLang = countryLinkLocale(selectedLocale ?? parsed.lang, c);
                  const swapped = swapCountryInPath(pathname, slug, nextLang);
                  const href =
                    swapped === pathname ? `/${slug}/${nextLang}` : swapped;
                  return (
                    <li key={c.code}>
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          onClick={() => switchTo(href, nextLang)}
                          className="flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[14px] px-3 py-3.5 text-left text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                        >
                          <span className="inline-flex items-center gap-3">
                            <Flag code={c.code} size="md" />
                            <span>{c.name}</span>
                          </span>
                          {isActive ? (
                            <Check
                              className="size-4 text-[var(--color-brand-primary)]"
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      </Dialog.Close>
                    </li>
                  );
                })}
              </ul>
            </section>

            {activeCountry && activeCountry.supportedLocales.length > 1 ? (
              // min-height reserves space for this section's own render so
              // client-only `activeCountry` resolution doesn't pop the
              // account/CTA block below it down after hydration.
              <section className="mb-6" style={{ minHeight: 44 * activeCountry.supportedLocales.length + 32 }}>
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                  <Languages aria-hidden className="size-3.5" />
                  {navigation.navLanguage}
                </p>
                <ul aria-label={a11y.chooseLanguage} className="flex flex-col gap-1">
                  {activeCountry.supportedLocales.map((loc) => {
                    const isActive = loc === activeLang;
                    const href = swapLangInPath(pathname, loc);
                    return (
                      <li key={loc}>
                        <Dialog.Close asChild>
                          <button
                            type="button"
                            onClick={() => switchTo(href, loc)}
                            className="flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[14px] px-3 py-3.5 text-left text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                          >
                            <span className="inline-flex items-center gap-2">
                              <span className="uppercase text-[var(--color-text-muted)] text-[14px]">
                                {loc}
                              </span>
                              <span>{localeDisplayName(loc, "native")}</span>
                            </span>
                            {isActive ? (
                              <Check
                                className="size-4 text-[var(--color-brand-primary)]"
                                aria-hidden
                              />
                            ) : null}
                          </button>
                        </Dialog.Close>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <div className="mt-2 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6">
              {authLoading ? (
                // Hint present, session not resolved yet: optimistic generic
                // portal link — self-corrects once /account/(admin|doctor)
                // resolves the real role server-side.
                <Dialog.Close asChild>
                  <Link
                    href="/account"
                    className="flex min-h-[44px] items-center gap-3 rounded-[14px] px-3 py-3.5 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                  >
                    <User className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
                    {navigation.navAccountPortal}
                  </Link>
                </Dialog.Close>
              ) : authUser ? (
                <Dialog.Close asChild>
                  <Link
                    href={portalHref}
                    className="flex min-h-[44px] items-center gap-3 rounded-[14px] px-3 py-3.5 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                  >
                    <User className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
                    {portalLabel}
                  </Link>
                </Dialog.Close>
              ) : (
                <Dialog.Close asChild>
                  <Link
                    href={navigation.headerAuthLink.href}
                    className="flex min-h-[44px] items-center rounded-[14px] px-3 py-3.5 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                  >
                    {navigation.headerAuthLink.label}
                  </Link>
                </Dialog.Close>
              )}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4">
            <Dialog.Close asChild>
              <Link href={bookHref} className="gh-btn gh-btn-primary flex w-full text-base shadow-[var(--shadow-elevated)]">
                {navigation.navBookAppointment}
              </Link>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

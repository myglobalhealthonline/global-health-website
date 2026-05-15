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
import type { AuthUser } from "@/lib/api/auth-api";
import { DEFAULT_BRAND_LOGO } from "@/lib/content/brand-logo";
import { countries, getCountryByCode } from "@/data/countries";
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

const FLAG_CLASS: Record<string, string> = {
  ie: "fi fi-ie",
  pt: "fi fi-pt",
  sp: "fi fi-es",
  cz: "fi fi-cz",
  rm: "fi fi-ro",
};

export function MobileNav({
  siteName,
  navigation,
  brandLogo = DEFAULT_BRAND_LOGO,
  authUser,
}: {
  siteName: string;
  navigation: SiteNavigationData;
  brandLogo?: { src: string; alt: string };
  authUser?: AuthUser | null;
}) {
  const pathname = usePathname() || "/";
  const parsed = parseSitePath(pathname);
  const activeCountryCode = parsed.country
    ? countryCodeFromSlug(parsed.country)
    : null;
  const activeCountry = activeCountryCode ? getCountryByCode(activeCountryCode) : null;
  const activeLang = parsed.lang ?? activeCountry?.defaultLocale ?? null;

  const portalHref = authUser?.role === "ADMIN" ? "/admin" : "/account";
  const portalLabel = authUser?.role === "ADMIN" ? "Admin Portal" : "User Portal";

  const sectionLinks =
    activeCountry && parsed.country && parsed.lang
      ? [
          { href: `/${parsed.country}/${parsed.lang}`, label: "Home" },
          { href: `/${parsed.country}/${parsed.lang}/doctors`, label: "Doctors" },
          {
            href: `/${parsed.country}/${parsed.lang}/general-consultation`,
            label: "General consultation",
          },
          {
            href: `/${parsed.country}/${parsed.lang}/specialist-consultation`,
            label: "Specialist consultation",
          },
        ]
      : [];

  const bookHref =
    activeCountry && parsed.lang
      ? `/${COUNTRY_CODE_TO_SLUG[activeCountry.code]}/${parsed.lang}/book-online`
      : navigation.headerPrimaryCta.href;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex rounded-full border border-[var(--color-border)] bg-white p-2.5 text-[var(--color-text-primary)] lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-0 top-0 z-50 flex max-h-[100dvh] flex-col bg-white shadow-[var(--shadow-elevated)] lg:hidden">
          <Dialog.Title className="sr-only">Main navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Switch country, change language, and book a consultation.
          </Dialog.Description>

          <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
            <Link href="/" className="flex items-center" aria-label={`${siteName} home`}>
              <Image
                src={brandLogo.src}
                alt={brandLogo.alt}
                width={280}
                height={120}
                className="h-10 w-auto max-w-[200px]"
              />
            </Link>
            <Dialog.Close className="inline-flex rounded-full border border-[var(--color-border)] bg-white p-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] focus-visible:ring-offset-2">
              <span className="sr-only">Close menu</span>
              <X className="size-5 text-[var(--color-text-primary)]" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="grow overflow-y-auto px-5 py-5 pb-28">
            {sectionLinks.length > 0 ? (
              <section className="mb-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                  {activeCountry?.name} clinic
                </p>
                <ul className="flex flex-col gap-1">
                  {sectionLinks.map((item) => (
                    <li key={item.href}>
                      <Dialog.Close asChild>
                        <Link
                          href={item.href}
                          className="block rounded-[14px] px-3 py-3 text-[17px] font-medium leading-snug text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
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
                Choose country
              </p>
              <ul className="flex flex-col gap-1">
                {countries.map((c) => {
                  const isActive = c.code === activeCountryCode;
                  const slug = COUNTRY_CODE_TO_SLUG[c.code];
                  const href = swapCountryInPath(pathname, slug, c.defaultLocale);
                  return (
                    <li key={c.code}>
                      <Dialog.Close asChild>
                        <Link
                          href={href}
                          className="flex items-center justify-between rounded-[14px] px-3 py-3 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                        >
                          <span className="inline-flex items-center gap-3">
                            <span
                              aria-hidden
                              className={`${FLAG_CLASS[c.code] ?? ""} inline-block`}
                              style={{
                                width: 22,
                                height: 16,
                                borderRadius: 2,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            />
                            <span>{c.name}</span>
                          </span>
                          {isActive ? (
                            <Check
                              className="size-4 text-[var(--color-brand-primary)]"
                              aria-hidden
                            />
                          ) : null}
                        </Link>
                      </Dialog.Close>
                    </li>
                  );
                })}
              </ul>
            </section>

            {activeCountry && activeCountry.supportedLocales.length > 1 ? (
              <section className="mb-6">
                <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-primary)]">
                  <Languages aria-hidden className="size-3.5" />
                  Language
                </p>
                <ul className="flex flex-col gap-1">
                  {activeCountry.supportedLocales.map((loc) => {
                    const isActive = loc === activeLang;
                    const href = swapLangInPath(pathname, loc);
                    return (
                      <li key={loc}>
                        <Dialog.Close asChild>
                          <Link
                            href={href}
                            className="flex items-center justify-between rounded-[14px] px-3 py-3 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
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
                          </Link>
                        </Dialog.Close>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <div className="mt-2 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6">
              {authUser ? (
                <Dialog.Close asChild>
                  <Link
                    href={portalHref}
                    className="flex items-center gap-3 rounded-[14px] px-3 py-3 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                  >
                    <User className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
                    {portalLabel}
                  </Link>
                </Dialog.Close>
              ) : (
                <Dialog.Close asChild>
                  <Link
                    href={navigation.headerAuthLink.href}
                    className="rounded-[14px] px-3 py-3 text-[17px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
                  >
                    {navigation.headerAuthLink.label}
                  </Link>
                </Dialog.Close>
              )}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--color-border)] bg-white/95 p-4 backdrop-blur-md">
            <Dialog.Close asChild>
              <Link href={bookHref} className="gh-btn gh-btn-primary flex w-full text-base">
                Book consultation
              </Link>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

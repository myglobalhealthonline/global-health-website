"use client";

/**
 * Compact dropdown that swaps the `[lang]` segment of the current URL.
 *
 * Country pages  — swaps the URL segment + writes gh_locale cookie.
 * Global pages   — writes gh_locale cookie + calls router.refresh() so the
 *                  server re-renders the same page in the new language.
 *                  (Global pages have no [lang] segment to swap.)
 *
 * To add a new language site-wide:
 *   1. Extend `LocaleCode` in `lib/i18n/types.ts` + the Prisma enum.
 *   2. Add a row in `LOCALE_DISPLAY` (`lib/i18n/locale-display.ts`).
 *   3. Add the locale to the country's `supportedLocales` (admin Countries page).
 * No component edits required.
 */

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Languages } from "lucide-react";
import type { LocaleCode } from "@/lib/i18n/types";
import { localeDisplayName } from "@/lib/i18n/locale-display";
import { swapLangInPath } from "@/lib/routing/path-rewrites";
import { setClientLocaleCookie } from "@/lib/i18n/get-client-locale";
import { AppMenu, AppMenuItem } from "@/components/AppMenu";
import { hasAuthHintCookie } from "@/components/layout/PublicAuthContext";
import { patchCurrentUser, type UserPreferredLocale } from "@/lib/api/auth-api";

/**
 * Persist the switch server-side when the visitor is (plausibly) signed
 * in, so it survives to a new device/browser via the login-seed step
 * (see the login flow). Anonymous visitors are the majority — skip the
 * round-trip entirely unless the auth-hint cookie says otherwise, and
 * silently ignore failures (401 on an already-expired session included):
 * the cookie write above already applied the switch for this device, so
 * nothing user-visible depends on this succeeding.
 */
function persistPreferredLocale(locale: LocaleCode): void {
  if (!hasAuthHintCookie()) return;
  void patchCurrentUser({ preferredLocale: locale.toUpperCase() as UserPreferredLocale }).catch(() => {});
}

export function LanguageSwitcher({
  currentLang,
  availableLocales,
  mode = "auto",
  chooseLanguageLabel,
}: {
  currentLang: LocaleCode;
  availableLocales: LocaleCode[];
  /** Localized aria-label for the locale list, resolved server-side by the
   *  caller (this is a client component — it must not import the bundles). */
  chooseLanguageLabel: string;
  /** Accepted for caller compatibility (SiteHeader passes it) but not
   *  currently consumed — the path-swap logic below already handles the
   *  global-page case. Kept in the prop type so callers still typecheck. */
  fallbackCountrySlug?: string;
  /** "refresh" forces the cookie + router.refresh() branch for every
   *  locale — used by the portals, whose routes (e.g. /doctor/profile/ie)
   *  would otherwise be misdetected as [country]/[lang] pages. */
  mode?: "auto" | "refresh";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (availableLocales.length <= 1) return null;

  const itemClass = (isActive: boolean) =>
    `group/sub flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border-none px-3.5 py-2.5 text-left text-[13px] font-semibold outline-none transition-colors duration-150 hover:bg-white/[0.08] focus-visible:bg-white/[0.08] data-[highlighted]:bg-white/[0.08] motion-reduce:transition-none ${
      isActive ? "text-[var(--color-brand-accent)]" : "text-white/90"
    }`;

  return (
    <AppMenu
      onOpenChange={setOpen}
      contentClassName="gh2-glass-forest gh2-filters-dark min-w-[200px] p-2"
      trigger={
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={open}
          data-open={open}
          className="gh-focus-on-dark inline-flex cursor-pointer items-center gap-1.5 rounded-full border-none bg-transparent px-3 py-1.5 text-[13px] font-semibold text-white/85 transition-colors duration-200 hover:text-white data-[open=true]:text-white"
          style={{ minHeight: 44 }}
        >
          <Languages aria-hidden className="size-3.5 opacity-80" />
          <span className="uppercase">{currentLang}</span>
          <ChevronDown
            aria-hidden
            className="size-3 opacity-70 transition-transform duration-200 motion-reduce:transition-none"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          />
        </button>
      }
    >
      <ul aria-label={chooseLanguageLabel} className="m-0 list-none">
        {availableLocales.map((loc) => {
              const isActive = loc === currentLang;
              const current = pathname || "/";
              const swapped = swapLangInPath(current, loc);
              // True when the path has a [country]/[lang] structure we can swap.
              const isCountryPage =
                mode !== "refresh" &&
                (swapped !== current ||
                  /\/[a-z]{2,}\/[a-z]{2}(?:\/|$)/.test(current));

              const label = (
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`h-3.5 w-[3px] shrink-0 rounded-full transition-opacity duration-150 group-hover/sub:opacity-100 group-focus-visible/sub:opacity-100 group-data-[highlighted]/sub:opacity-100 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ background: "var(--color-brand-accent)" }}
                  />
                  <span className="uppercase text-white/55">{loc}</span>
                  <span>{localeDisplayName(loc, "native")}</span>
                </span>
              );

              if (isCountryPage) {
                // Hard-navigate so the server layout re-renders with the new
                // locale. Using <Link> (client-side nav) preserves the shared
                // (site)/layout.tsx and the navbar/footer never see the new
                // x-gh-locale header stamped by the middleware.
                return (
                  <li key={loc}>
                    <AppMenuItem asChild>
                      <button
                        type="button"
                        onClick={() => {
                          setClientLocaleCookie(loc);
                          persistPreferredLocale(loc);
                          setOpen(false);
                          window.location.href = swapped;
                        }}
                        className={itemClass(isActive)}
                      >
                        {label}
                      </button>
                    </AppMenuItem>
                  </li>
                );
              }

              // Global page — set cookie and refresh so the server
              // re-renders the same page in the chosen language.
              return (
                <li key={loc}>
                  <AppMenuItem asChild>
                    <button
                      type="button"
                      onClick={() => {
                        setClientLocaleCookie(loc);
                        persistPreferredLocale(loc);
                        setOpen(false);
                        router.refresh();
                      }}
                      className={itemClass(isActive)}
                    >
                      {label}
                    </button>
                  </AppMenuItem>
                </li>
              );
        })}
      </ul>
    </AppMenu>
  );
}

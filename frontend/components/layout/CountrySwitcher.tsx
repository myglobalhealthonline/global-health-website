"use client";

/**
 * Compact country dropdown for the public header.
 *
 * Swaps the `[country]` segment of the current URL while preserving the
 * section (`/[country]/[lang]/doctors` → `/[newCountry]/[newDefaultLocale]/doctors`).
 *
 * Data-driven from `countries` config (`data/countries.ts`). Adding a new
 * country = add a `CountryConfig` row + seed CountryLocale + content; the
 * switcher renders it automatically.
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { type CountryCode, type CountryConfig } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { parseSitePath, swapCountryInPath } from "@/lib/routing/path-rewrites";
import { useCart } from "@/components/cart/CartContext";
import { Flag } from "@/components/ui/Flag";
import { setClientLocaleCookie } from "@/lib/i18n/get-client-locale";
import { AppMenu, AppMenuItem } from "@/components/AppMenu";

export function CountrySwitcher({
  activeCountryCode,
  countries,
}: {
  activeCountryCode: CountryCode | null;
  countries: CountryConfig[];
}) {
  const pathname = usePathname();
  const { cart, clear } = useCart();
  const [open, setOpen] = useState(false);

  // If the cart has items pinned to a specific country, switching to a
  // different country mid-flow would either silently mismatch pricing
  // or get rejected at checkout. Intercept and confirm; clear the cart
  // on accept so the new country starts fresh.
  //
  // Always HARD-navigates (window.location.href, not <Link>/router.push):
  // client-side nav preserves the shared (site)/layout.tsx, so the
  // navbar/footer would keep rendering in the previous country's language
  // until a full reload. Also syncs the gh_locale cookie to the language
  // the target URL will render in — otherwise a stale cookie (e.g. "pt"
  // from a Portugal visit) leaks the old language back into global pages.
  function handleSwitch(
    nextHref: string,
    nextCountryCode: CountryCode,
    nextLang: string,
  ) {
    if (
      cart.itemCount > 0 &&
      cart.countryCode &&
      cart.countryCode.toUpperCase() !== nextCountryCode.toUpperCase()
    ) {
      const proceed = window.confirm(
        `Your cart has ${cart.itemCount} item${
          cart.itemCount === 1 ? "" : "s"
        } from ${cart.countryCode.toUpperCase()}. Switching to a new country will clear it. Continue?`,
      );
      if (!proceed) return;
      void clear();
    }
    setOpen(false);
    setClientLocaleCookie(nextLang);
    globalThis.location.assign(nextHref);
  }

  const active = activeCountryCode
    ? countries.find((c) => c.code === activeCountryCode) ?? null
    : null;

  return (
    <AppMenu
      onOpenChange={setOpen}
      contentClassName="gh2-glass-forest gh2-filters-dark min-w-[220px] p-2"
      trigger={
        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={open ? "true" : "false"}
          data-open={open}
          className="gh-focus-on-dark inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border-none bg-transparent px-3 py-1.5 text-[13px] font-semibold text-white/85 transition-colors duration-200 hover:text-white data-[open=true]:text-white"
        >
          {active ? <Flag code={active.code} size="sm" /> : null}
          <span>{active ? active.name : "Choose country"}</span>
          <ChevronDown
            aria-hidden
            className="size-3 opacity-70 transition-transform duration-200 motion-reduce:transition-none data-[open=true]:rotate-180"
            data-open={open}
          />
        </button>
      }
    >
      <ul aria-label="Choose country" className="m-0 list-none">
        {countries.map((c) => {
          const isActive = c.code === activeCountryCode;
              // Prefer the slug on the country data itself; the client-side
              // registry proxy may not be warm for admin-added countries.
          const slug =
            c.slug || COUNTRY_CODE_TO_SLUG[c.code] || c.code.toLowerCase();
              // Keep the visitor's current language when the target
              // country supports it; otherwise fall back to the target
              // country's default locale. This makes country switching
              // language-stable instead of silently resetting the
              // visitor's choice on every switch.
          const current = pathname || "/";
          const currentLang = parseSitePath(current).lang;
          const nextLang = (
            currentLang &&
            (c.supportedLocales as string[]).includes(currentLang)
              ? currentLang
              : c.defaultLocale
          ).toLowerCase();
              // On country-scoped paths (/{country}/{lang}/...) swap
              // the country segment in place. On global paths
              // (/about, /blog, /faq, /contact, /) there's nothing to
              // swap — route straight to the country home.
              // swapCountryInPath returns the input unchanged on global
              // paths, so detect that and route to the country home.
          const swapped = swapCountryInPath(current, slug, nextLang);
          const href = swapped === current ? `/${slug}/${nextLang}` : swapped;
          return (
            <li key={c.code}>
              <AppMenuItem asChild>
                <button
                  type="button"
                  onClick={() => handleSwitch(href, c.code, nextLang)}
                  className={`group/sub flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-[var(--radius-card-sm)] border-none px-3.5 py-2.5 text-left text-[13px] font-semibold outline-none transition-colors duration-150 hover:bg-white/[0.08] focus-visible:bg-white/[0.08] data-[highlighted]:bg-white/[0.08] motion-reduce:transition-none ${
                    isActive ? "text-[var(--color-brand-accent)]" : "text-white/90"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-3.5 w-[3px] shrink-0 rounded-full transition-opacity duration-150 group-hover/sub:opacity-100 group-focus-visible/sub:opacity-100 group-data-[highlighted]/sub:opacity-100 ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ background: "var(--color-brand-accent)" }}
                  />
                  <Flag code={c.code} size="sm" />
                  <span>{c.name}</span>
                </button>
              </AppMenuItem>
            </li>
          );
        })}
      </ul>
    </AppMenu>
  );
}

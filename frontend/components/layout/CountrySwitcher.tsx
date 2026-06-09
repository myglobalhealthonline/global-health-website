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

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { type CountryCode, type CountryConfig } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { swapCountryInPath } from "@/lib/routing/path-rewrites";
import { useCart } from "@/components/cart/CartContext";
import { Flag } from "@/components/ui/Flag";

export function CountrySwitcher({
  activeCountryCode,
  countries,
}: {
  activeCountryCode: CountryCode | null;
  countries: CountryConfig[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { cart, clear } = useCart();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // If the cart has items pinned to a specific country, switching to a
  // different country mid-flow would either silently mismatch pricing
  // or get rejected at checkout. Intercept and confirm; clear the cart
  // on accept so the new country starts fresh.
  function handleSwitch(
    nextHref: string,
    nextCountryCode: CountryCode,
    e: React.MouseEvent,
  ) {
    if (
      cart.itemCount > 0 &&
      cart.countryCode &&
      cart.countryCode.toUpperCase() !== nextCountryCode.toUpperCase()
    ) {
      e.preventDefault();
      const proceed = window.confirm(
        `Your cart has ${cart.itemCount} item${
          cart.itemCount === 1 ? "" : "s"
        } from ${cart.countryCode.toUpperCase()}. Switching to a new country will clear it. Continue?`,
      );
      if (!proceed) return;
      void clear();
      setOpen(false);
      router.push(nextHref);
      return;
    }
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const active = activeCountryCode
    ? countries.find((c) => c.code === activeCountryCode) ?? null
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-open={open}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[13px] font-semibold text-white/85 transition-colors duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 data-[open=true]:border-white/30 data-[open=true]:bg-white/10"
        style={{ minHeight: 40 }}
      >
        {active ? <Flag code={active.code} size="sm" /> : null}
        <span>{active ? active.name : "Choose country"}</span>
        <ChevronDown
          aria-hidden
          className="size-3 opacity-70 transition-transform duration-200 motion-reduce:transition-none"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Choose country"
          className="absolute right-0 z-50 mt-2 overflow-hidden"
          style={{
            minWidth: 220,
            background: "var(--color-background-page)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          <ul className="m-0 list-none p-1">
            {countries.map((c) => {
              const isActive = c.code === activeCountryCode;
              const slug = COUNTRY_CODE_TO_SLUG[c.code];
              // On country-scoped paths (/{country}/{lang}/...) swap
              // the country segment in place. On global paths
              // (/about, /blog, /faq, /contact, /) there's nothing to
              // swap — route straight to the country home in its
              // default locale. swapCountryInPath returns the input
              // unchanged on global paths, so detect that and route
              // to the country home instead.
              const current = pathname || "/";
              const swapped = swapCountryInPath(current, slug, c.defaultLocale);
              const href =
                swapped === current
                  ? `/${slug}/${c.defaultLocale.toLowerCase()}`
                  : swapped;
              return (
                <li key={c.code}>
                  <Link
                    href={href}
                    onClick={(e) => handleSwitch(href, c.code, e)}
                    role="menuitem"
                    className="flex items-center justify-between gap-3"
                    style={{
                      padding: "9px 12px",
                      borderRadius: 8,
                      textDecoration: "none",
                      background: isActive
                        ? "var(--color-background-soft)"
                        : "transparent",
                      color: "var(--color-text-primary)",
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 500,
                    }}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Flag code={c.code} size="sm" />
                      <span>{c.name}</span>
                    </span>
                    {isActive ? (
                      <Check
                        aria-hidden
                        className="size-3.5 text-[var(--color-brand-primary)]"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

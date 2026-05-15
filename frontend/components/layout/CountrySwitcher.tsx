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
import { usePathname } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { countries, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { swapCountryInPath } from "@/lib/routing/path-rewrites";

const FLAG_CLASS: Record<string, string> = {
  ie: "fi fi-ie",
  pt: "fi fi-pt",
  sp: "fi fi-es",
  cz: "fi fi-cz",
  rm: "fi fi-ro",
};

export function CountrySwitcher({
  activeCountryCode,
}: {
  activeCountryCode: CountryCode | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        className="inline-flex items-center gap-2 transition-colors"
        style={{
          padding: "8px 12px",
          borderRadius: 999,
          border: "1px solid var(--color-border)",
          background: "var(--color-background-page)",
          color: "var(--color-text-primary)",
          fontFamily: "inherit",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {active ? (
          <span
            aria-hidden
            className={`${FLAG_CLASS[active.code] ?? ""} inline-block`}
            style={{
              width: 18,
              height: 13,
              borderRadius: 2,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : null}
        <span>{active ? active.name : "Choose country"}</span>
        <ChevronDown aria-hidden className="size-3" />
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
              const href = swapCountryInPath(
                pathname || "/",
                slug,
                c.defaultLocale,
              );
              return (
                <li key={c.code}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
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
                      <span
                        aria-hidden
                        className={`${FLAG_CLASS[c.code] ?? ""} inline-block`}
                        style={{
                          width: 18,
                          height: 13,
                          borderRadius: 2,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      />
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

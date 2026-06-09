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

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Languages, Check } from "lucide-react";
import type { LocaleCode } from "@/lib/i18n/types";
import { localeDisplayName } from "@/lib/i18n/locale-display";
import { swapLangInPath } from "@/lib/routing/path-rewrites";

function setLocaleCookie(loc: LocaleCode) {
  document.cookie = `gh_locale=${loc}; path=/; max-age=31536000; SameSite=Lax`;
}

export function LanguageSwitcher({
  currentLang,
  availableLocales,
  /** When the current URL has no country/lang segment to swap (the
   *  global pages: /about, /blog, /faq, /contact, /), the switcher
   *  routes to the country home in the chosen language instead of
   *  mangling the path. Required by the SiteHeader's last-country
   *  fallback so the picker still works after the visitor leaves
   *  the country-scoped URL space. */
  fallbackCountrySlug,
}: {
  currentLang: LocaleCode;
  availableLocales: LocaleCode[];
  fallbackCountrySlug?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
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

  if (availableLocales.length <= 1) return null;

  const itemStyle = (isActive: boolean): React.CSSProperties => ({
    padding: "9px 12px",
    borderRadius: 8,
    textDecoration: "none",
    background: isActive ? "var(--color-background-soft)" : "transparent",
    color: "var(--color-text-primary)",
    fontSize: 13,
    fontWeight: isActive ? 700 : 500,
    cursor: "pointer",
    border: "none",
    width: "100%",
    textAlign: "left" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-open={open}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[13px] font-semibold text-white/85 transition-colors duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 data-[open=true]:border-white/30 data-[open=true]:bg-white/10"
        style={{ minHeight: 40 }}
      >
        <Languages aria-hidden className="size-3.5 opacity-80" />
        <span className="uppercase">{currentLang}</span>
        <ChevronDown
          aria-hidden
          className="size-3 opacity-70 transition-transform duration-200 motion-reduce:transition-none"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Choose language"
          className="absolute right-0 z-50 mt-2 overflow-hidden"
          style={{
            minWidth: 200,
            background: "var(--color-background-page)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          <ul className="m-0 list-none p-1">
            {availableLocales.map((loc) => {
              const isActive = loc === currentLang;
              const current = pathname || "/";
              const swapped = swapLangInPath(current, loc);
              // True when the path has a [country]/[lang] structure we can swap.
              const isCountryPage =
                swapped !== current ||
                /\/[a-z]{2,}\/[a-z]{2}(?:\/|$)/.test(current);

              const label = (
                <span className="inline-flex items-center gap-2">
                  <span className="uppercase text-[var(--color-text-muted)]">
                    {loc}
                  </span>
                  <span>{localeDisplayName(loc, "native")}</span>
                </span>
              );

              if (isCountryPage) {
                // URL-based swap — navigate to new path and persist cookie.
                return (
                  <li key={loc}>
                    <Link
                      href={swapped}
                      onClick={() => {
                        setLocaleCookie(loc);
                        setOpen(false);
                      }}
                      role="menuitem"
                      style={itemStyle(isActive)}
                    >
                      {label}
                      {isActive ? (
                        <Check
                          aria-hidden
                          className="size-3.5 text-[var(--color-brand-primary)]"
                        />
                      ) : null}
                    </Link>
                  </li>
                );
              }

              // Global page — set cookie and refresh so the server
              // re-renders the same page in the chosen language.
              return (
                <li key={loc}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setLocaleCookie(loc);
                      setOpen(false);
                      router.refresh();
                    }}
                    style={itemStyle(isActive)}
                  >
                    {label}
                    {isActive ? (
                      <Check
                        aria-hidden
                        className="size-3.5 text-[var(--color-brand-primary)]"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

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
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Languages, Check } from "lucide-react";
import type { LocaleCode } from "@/lib/i18n/types";
import { localeDisplayName } from "@/lib/i18n/locale-display";
import { swapLangInPath } from "@/lib/routing/path-rewrites";
import { setClientLocaleCookie } from "@/lib/i18n/get-client-locale";

export function LanguageSwitcher({
  currentLang,
  availableLocales,
  mode = "auto",
}: {
  currentLang: LocaleCode;
  availableLocales: LocaleCode[];
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
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (availableLocales.length <= 1) return null;

  const itemStyle = (isActive: boolean): React.CSSProperties => ({
    minHeight: 44,
    padding: "10px 14px",
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
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
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

      {open ? (
        <div
          aria-label="Choose language"
          className="absolute right-0 z-[var(--z-dropdown)] mt-2 overflow-hidden"
          style={{
            minWidth: 200,
            maxHeight: "min(calc(100vh - 120px), 320px)",
            overflowY: "auto",
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
                mode !== "refresh" &&
                (swapped !== current ||
                  /\/[a-z]{2,}\/[a-z]{2}(?:\/|$)/.test(current));

              const label = (
                <span className="inline-flex items-center gap-2">
                  <span className="uppercase text-[var(--color-text-muted)]">
                    {loc}
                  </span>
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
                    <button
                      type="button"
                      onClick={() => {
                        setClientLocaleCookie(loc);
                        setOpen(false);
                        window.location.href = swapped;
                      }}
                      className="gh-switcher-item"
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
              }

              // Global page — set cookie and refresh so the server
              // re-renders the same page in the chosen language.
              return (
                <li key={loc}>
                  <button
                    type="button"
                    onClick={() => {
                      setClientLocaleCookie(loc);
                      setOpen(false);
                      router.refresh();
                    }}
                    className="gh-switcher-item"
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

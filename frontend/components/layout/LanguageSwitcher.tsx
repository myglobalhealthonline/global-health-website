"use client";

/**
 * Compact dropdown that swaps the `[lang]` segment of the current URL.
 *
 * Data-driven by the active country's `supportedLocales` — no hardcoded list.
 * To add a new language site-wide:
 *   1. Extend `LocaleCode` in `lib/i18n/types.ts` + the Prisma enum.
 *   2. Add a row in `LOCALE_DISPLAY` (`lib/i18n/locale-display.ts`).
 *   3. Add the locale to the country's `supportedLocales` (admin Countries page).
 * No component edits required.
 */

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Languages, Check } from "lucide-react";
import type { LocaleCode } from "@/lib/i18n/types";
import { localeDisplayName } from "@/lib/i18n/locale-display";
import { swapLangInPath } from "@/lib/routing/path-rewrites";

export function LanguageSwitcher({
  currentLang,
  availableLocales,
}: {
  currentLang: LocaleCode;
  availableLocales: LocaleCode[];
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

  if (availableLocales.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 transition-colors"
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
        <Languages aria-hidden className="size-3.5" />
        <span className="uppercase">{currentLang}</span>
        <ChevronDown aria-hidden className="size-3" />
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
              const href = swapLangInPath(pathname || "/", loc);
              return (
                <li key={loc}>
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
                    <span className="inline-flex items-center gap-2">
                      <span className="uppercase text-[var(--color-text-muted)]">
                        {loc}
                      </span>
                      <span>{localeDisplayName(loc, "native")}</span>
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

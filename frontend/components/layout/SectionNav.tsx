"use client";

/**
 * Country-scoped section tabs shown in the public header when the user is
 * inside `/[country]/[lang]/…`. Tabs: Home / Doctors / General Consultation /
 * Specialist Consultation. Active tab highlights via pathname match.
 *
 * Hidden when not inside a country (the entry page `/` shows the country
 * picker instead).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SectionNavItem = {
  href: string;
  label: string;
  /** Exact-match required (e.g. country home), default false (prefix-match). */
  exact?: boolean;
};

export function SectionNav({ items }: { items: SectionNavItem[] }) {
  const pathname = usePathname() || "";

  function isActive(item: SectionNavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  return (
    <nav
      aria-label="Section navigation"
      className="hidden items-center md:flex"
      style={{
        gap: 4,
        background: "var(--color-background-soft)",
        padding: 4,
        borderRadius: 999,
        border: "1px solid var(--color-border)",
        width: "fit-content",
      }}
    >
      {items.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center transition-all duration-150"
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              background: active ? "var(--color-background-page)" : "transparent",
              color: active
                ? "var(--color-text-primary)"
                : "var(--color-text-muted)",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: active ? "var(--shadow-soft)" : "none",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

/**
 * Public header section nav. Supports flat link items + dropdown items
 * with submenus (e.g. Services → GP, Specialist, Prescriptions, Tests).
 * Renders as a pill rail at md+. Hidden below — the MobileNav drawer
 * handles small viewports.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export type SectionNavItem = {
  /** Direct link href — required when `children` is omitted. */
  href?: string;
  label: string;
  /** Exact-match required (e.g. country home), default false (prefix-match). */
  exact?: boolean;
  /** When set, the item renders as a dropdown trigger; clicking shows
   *  these children in a Radix DropdownMenu popover. */
  children?: Array<{ href: string; label: string; description?: string }>;
};

export function SectionNav({ items }: { items: SectionNavItem[] }) {
  const pathname = usePathname() || "";

  function isLinkActive(item: SectionNavItem): boolean {
    if (!item.href) return false;
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function isDropdownActive(item: SectionNavItem): boolean {
    if (!item.children) return false;
    return item.children.some(
      (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
    );
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
        // Dropdown item — Radix DropdownMenu trigger + content.
        if (item.children && item.children.length > 0) {
          const active = isDropdownActive(item);
          return (
            <DropdownMenu.Root key={item.label}>
              <DropdownMenu.Trigger
                className="inline-flex items-center gap-1 transition-all duration-150 focus-visible:outline-none"
                style={pillStyle(active)}
                aria-label={`${item.label} submenu`}
              >
                {item.label}
                <ChevronDown
                  className="size-3.5 opacity-70"
                  strokeWidth={1.5}
                  aria-hidden
                />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  sideOffset={10}
                  align="start"
                  className="z-50 min-w-[280px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-page)] p-2 shadow-[var(--shadow-elevated)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                >
                  {item.children.map((c) => (
                    <DropdownMenu.Item key={c.href} asChild>
                      <Link
                        href={c.href}
                        className="
                          flex flex-col gap-0.5 rounded-[var(--radius-card-sm)]
                          px-3 py-2.5
                          text-sm font-semibold text-[var(--color-text-primary)]
                          outline-none
                          transition-colors duration-150
                          hover:bg-[var(--color-background-soft)]
                          focus-visible:bg-[var(--color-background-soft)]
                          data-[highlighted]:bg-[var(--color-background-soft)]
                          motion-reduce:transition-none
                        "
                      >
                        <span>{c.label}</span>
                        {c.description ? (
                          <span className="text-xs font-normal text-[var(--color-text-muted)]">
                            {c.description}
                          </span>
                        ) : null}
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          );
        }

        // Flat link item.
        const active = isLinkActive(item);
        return (
          <Link
            key={item.href ?? item.label}
            href={item.href ?? "#"}
            className="inline-flex items-center transition-all duration-150"
            style={pillStyle(active)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
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
    cursor: "pointer",
    border: "none",
  };
}

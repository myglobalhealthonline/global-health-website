"use client";

/**
 * Public header section nav. Supports flat link items + dropdown items
 * with submenus (e.g. Services → GP, Specialist, Prescriptions, Tests).
 * Renders as a pill rail at md+. Hidden below — the MobileNav drawer
 * handles small viewports.
 *
 * Tabs are className-driven (not inline styles) so hover + focus states
 * actually work. The ACTIVE tab is rendered in the brand lime accent —
 * lime is used as an accent here (text), never as a button fill.
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

const PILL_BASE =
  "group/navitem relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 2xl:px-4 py-2.5 text-[13px] font-bold whitespace-nowrap cursor-pointer outline-none transition-[color,background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2";

const DARK_FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F2E25]";

function pillClass(active: boolean, dark: boolean): string {
  if (dark) {
    // Underline treatment (no pill outline/fill): active = lime text +
    // lime underline; inactive = underline grows in from the left on hover.
    const underline =
      "after:absolute after:bottom-1 after:left-3 after:right-3 2xl:after:left-4 2xl:after:right-4 after:h-[2px] after:rounded-full after:bg-[var(--color-brand-accent)] after:origin-left after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:after:transition-none";
    return active
      ? `${PILL_BASE} text-[var(--color-brand-accent)] ${underline} after:scale-x-100 ${DARK_FOCUS_RING}`
      : `${PILL_BASE} text-white/65 hover:text-white ${underline} after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100 ${DARK_FOCUS_RING}`;
  }
  return active
    ? `${PILL_BASE} text-[var(--color-brand-primary)] bg-white shadow-[var(--shadow-soft)] focus-visible:ring-[color:rgba(29,75,54,0.3)]`
    : `${PILL_BASE} text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-white/60 focus-visible:ring-[color:rgba(29,75,54,0.3)]`;
}

export function SectionNav({
  items,
  variant = "light",
}: {
  items: SectionNavItem[];
  variant?: "light" | "dark";
}) {
  const pathname = usePathname() || "";
  const isDark = variant === "dark";

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
      className={`hidden items-center md:flex ${isDark ? "gap-1 2xl:gap-2" : ""}`}
      style={{
        gap: isDark ? undefined : 4,
        // Dark variant rides directly on the header's glass pill — no
        // nested rail, so the links read as part of the capsule (only the
        // active tab shows its own pill). Light variant keeps the rail.
        background: isDark ? "transparent" : "var(--color-background-soft)",
        padding: isDark ? 0 : 4,
        borderRadius: 999,
        border: isDark ? "none" : "1px solid var(--color-border)",
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
                className={pillClass(active, isDark)}
                aria-label={`${item.label} submenu`}
              >
                {item.label}
                <ChevronDown
                  className="size-3.5 opacity-70 transition-transform duration-200 group-data-[state=open]/navitem:rotate-180 motion-reduce:transition-none"
                  strokeWidth={2}
                  aria-hidden
                />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  sideOffset={10}
                  align="start"
                  className={
                    isDark
                      ? "gh2-glass-forest gh2-filters-dark z-[var(--z-dropdown)] min-w-[280px] p-2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                      : "z-[var(--z-dropdown)] min-w-[280px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-page)] p-2 shadow-[var(--shadow-elevated)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                  }
                >
                  {item.children.map((c) => (
                    <DropdownMenu.Item key={c.href} asChild>
                      <Link
                        href={c.href}
                        className={
                          isDark
                            ? "group/sub flex flex-col gap-0.5 rounded-[var(--radius-card-sm)] px-3 py-2.5 text-sm font-semibold text-white/90 outline-none transition-colors duration-150 hover:bg-white/[0.08] focus-visible:bg-white/[0.08] data-[highlighted]:bg-white/[0.08] motion-reduce:transition-none"
                            : "group/sub flex flex-col gap-0.5 rounded-[var(--radius-card-sm)] px-3 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] outline-none transition-colors duration-150 hover:bg-[var(--color-background-soft)] focus-visible:bg-[var(--color-background-soft)] data-[highlighted]:bg-[var(--color-background-soft)] motion-reduce:transition-none"
                        }
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden
                            className="h-3.5 w-[3px] rounded-full opacity-0 transition-opacity duration-150 group-hover/sub:opacity-100 group-focus-visible/sub:opacity-100 group-data-[highlighted]/sub:opacity-100"
                            style={{ background: "var(--color-brand-accent)" }}
                          />
                          {c.label}
                        </span>
                        {c.description ? (
                          <span
                            className={
                              isDark
                                ? "pl-[11px] text-xs font-normal text-white/55"
                                : "pl-[11px] text-xs font-normal text-[var(--color-text-muted)]"
                            }
                          >
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
            className={pillClass(active, isDark)}
            aria-current={active ? "page" : undefined}
          >
            {active && isDark ? (
              <span>
                {item.label}
              </span>
            ) : (
              item.label
            )}
          </Link>
        );
      })}
    </nav>
  );
}

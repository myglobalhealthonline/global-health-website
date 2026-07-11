"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { AppMenu, AppMenuItem } from "@/components/AppMenu";
import { AppSheet } from "@/components/AppSheet";

/**
 * Doctor directory filter bar (sits at the top of the DoctorTeamTemplate
 * grid section).
 *
 * Each chip is still an `<a>`/<Link> whose href the page computed from the
 * current search params, so filtering is a plain navigation — no client
 * state to keep in sync, URL stays shareable. The page owns all the
 * option/active/href logic; this component only styles + positions it.
 *
 * Desktop: each group opens in a portalled AppMenu (Radix DropdownMenu) —
 * collision-aware, single-panel-open, outside-click/Escape, focus restore
 * all come from Radix. Mobile (<768px): a single "Filters" trigger opens
 * every group inside a bottom AppSheet.
 */
export type FilterOption = {
  /** Stable token (language code / specialty slug) — used for the key. */
  token: string;
  /** Display label shown in the chip. */
  label: string;
  active: boolean;
  /** Toggle href (adds the token when off, removes it when on). */
  href: string;
};

export type FilterGroup = {
  /** Short heading shown above the chips, e.g. "Speaks". */
  heading: string;
  options: FilterOption[];
};

export function DoctorFilters({
  groups,
  clearHref,
  hasActive,
  clearLabel,
  dark = false,
}: {
  groups: FilterGroup[];
  clearHref: string;
  hasActive: boolean;
  clearLabel?: string;
  /** Forest-glass panel + on-dark chips — for dark grid sections. */
  dark?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleGroups = groups.filter((g) => g.options.length > 0);
  if (visibleGroups.length === 0) return null;

  const headingColor = dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)";
  const activeCount = visibleGroups.reduce(
    (n, g) => n + g.options.filter((o) => o.active).length,
    0,
  );

  const clearControl = hasActive ? (
    <Link
      href={clearHref}
      scroll={false}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold transition-colors duration-150"
      style={
        dark
          ? { borderColor: "rgba(255,255,255,0.20)", color: "var(--gh2-on-dark-muted)" }
          : { borderColor: "rgba(29,75,54,0.20)", color: "var(--color-text-muted)" }
      }
    >
      <X className="size-3.5" strokeWidth={2} aria-hidden />
      {clearLabel ?? "Clear all filters"}
    </Link>
  ) : null;

  return (
    <div
      className={`relative z-[var(--z-raised)] mb-8 flex flex-wrap items-center gap-2.5 ${
        dark ? "gh2-glass-forest gh2-filters-dark px-4 py-2.5" : ""
      }`}
    >
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em]"
        style={{ color: dark ? "rgba(255,255,255,0.92)" : "var(--color-text-primary)" }}
      >
        <SlidersHorizontal className="size-[14px]" strokeWidth={1.8} aria-hidden />
        Filters
        {activeCount > 0 ? (
          <span className="tabular-nums" style={{ color: headingColor }}>
            · {activeCount}
          </span>
        ) : null}
      </span>

      {/* Desktop: one portalled AppMenu per group. */}
      <div className="hidden md:contents">
        {visibleGroups.map((group) => {
          const groupActiveCount = group.options.filter((o) => o.active).length;
          return (
            <AppMenu
              key={group.heading}
              align="start"
              contentClassName={`gh2-filter-menu-content${dark ? " gh2-filter-menu-content--dark gh2-filters-dark" : ""}`}
              trigger={
                <button type="button" className="gh2-filter-trigger">
                  {group.heading}
                  {groupActiveCount > 0 ? (
                    <span className="gh2-filter-count tabular-nums">· {groupActiveCount}</span>
                  ) : null}
                  <ChevronDown className="gh2-filter-chevron size-3.5 opacity-70" strokeWidth={2} aria-hidden />
                </button>
              }
            >
              {group.options.map((opt) => (
                <AppMenuItem key={opt.token} asChild onSelect={(e) => e.preventDefault()}>
                  <Link
                    href={opt.href}
                    aria-current={opt.active ? "page" : undefined}
                    data-active={opt.active}
                    scroll={false}
                    className="gh2-pill-filter text-[12.5px]"
                  >
                    {opt.label}
                  </Link>
                </AppMenuItem>
              ))}
            </AppMenu>
          );
        })}
        {clearControl}
      </div>

      {/* Mobile: single trigger opening every group in a bottom sheet. */}
      <button
        type="button"
        className="gh2-filter-trigger md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        Filters
        {activeCount > 0 ? <span className="gh2-filter-count tabular-nums">· {activeCount}</span> : null}
      </button>
      <AppSheet
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        side="bottom"
        size="sm"
        theme="public"
        ariaLabel="Filters"
        header={
          <Dialog.Title asChild>
            <h2 className="gh2-filter-sheet-title">Filters</h2>
          </Dialog.Title>
        }
        footer={
          <div className="flex items-center justify-between gap-3">
            {clearControl}
            <button
              type="button"
              className="gh2-btn-compact gh2-btn-compact-primary"
              onClick={() => setMobileOpen(false)}
            >
              Show results
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {visibleGroups.map((group) => (
            <div key={group.heading}>
              <p className="gh2-filter-sheet-heading">{group.heading}</p>
              <div className="flex flex-wrap gap-2">
                {group.options.map((opt) => (
                  <Link
                    key={opt.token}
                    href={opt.href}
                    aria-current={opt.active ? "page" : undefined}
                    data-active={opt.active}
                    scroll={false}
                    className="gh2-pill-filter text-[12.5px]"
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AppSheet>
    </div>
  );
}

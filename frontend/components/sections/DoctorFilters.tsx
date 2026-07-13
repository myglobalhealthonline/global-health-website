"use client";

import Link from "next/link";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
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
 * One "Filters" trigger (all breakpoints) opens every group inside a
 * bottom AppSheet — no separate per-group desktop dropdowns.
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

  // The sheet's own panel is always the dark forest-glass skin (theme="public"
  // on AppSheet), independent of `dark` (which only styles the inline desktop
  // bar) — so its pills/clear link need the on-dark treatment regardless.
  const sheetClearControl = hasActive ? (
    <Link
      href={clearHref}
      scroll={false}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold transition-colors duration-150"
      style={{ borderColor: "rgba(255,255,255,0.20)", color: "var(--gh2-on-dark-muted)" }}
    >
      <X className="size-3.5" strokeWidth={2} aria-hidden />
      {clearLabel ?? "Clear all filters"}
    </Link>
  ) : null;

  return (
    <div
      className={`relative z-[var(--z-raised)] mb-8 flex w-fit flex-wrap items-center gap-2.5 ${
        dark ? "gh2-filters-dark" : ""
      }`}
    >
      {/* Single trigger (all breakpoints) opens every group in a sheet. */}
      <button
        type="button"
        className="gh2-filter-trigger inline-flex items-center gap-1.5"
        onClick={() => setMobileOpen(true)}
      >
        <SlidersHorizontal className="size-[14px]" strokeWidth={1.8} aria-hidden />
        Filters
        {activeCount > 0 ? <span className="gh2-filter-count tabular-nums">· {activeCount}</span> : null}
      </button>
      {clearControl}
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
            {sheetClearControl}
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
        <div className="gh2-filters-dark flex flex-col gap-5">
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

import Link from "next/link";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

/**
 * Doctor directory filter bar (sits at the top of the DoctorTeamTemplate
 * grid section).
 *
 * Pure presentational + SSR-friendly: every chip is an `<a>`/<Link>
 * whose href the page computed from the current search params, so
 * filtering works without client JS and the URL stays shareable. The
 * page owns all the option/active/href logic; this component only
 * styles it.
 *
 * Each group renders as a native `<details>` dropdown (no JS needed to
 * open/close) instead of an always-expanded chip panel.
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
  const visibleGroups = groups.filter((g) => g.options.length > 0);
  if (visibleGroups.length === 0) return null;

  const headingColor = dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)";
  const activeCount = visibleGroups.reduce(
    (n, g) => n + g.options.filter((o) => o.active).length,
    0,
  );

  return (
    <div
      className={`relative z-30 mb-8 flex flex-wrap items-center gap-2.5 ${
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

      {visibleGroups.map((group) => {
        const groupActiveCount = group.options.filter((o) => o.active).length;
        return (
          <details key={group.heading} className="gh2-filter-dropdown relative">
            <summary className="gh2-filter-trigger">
              {group.heading}
              {groupActiveCount > 0 ? (
                <span className="gh2-filter-count tabular-nums">· {groupActiveCount}</span>
              ) : null}
              <ChevronDown className="gh2-filter-chevron size-3.5 opacity-70" strokeWidth={2} aria-hidden />
            </summary>
            <div className="gh2-filter-panel">
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
          </details>
        );
      })}

      {hasActive ? (
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
      ) : null}
    </div>
  );
}

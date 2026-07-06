import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";

/**
 * Doctor directory filter bar (sits at the top of the DoctorTeamTemplate
 * grid section).
 *
 * Pure presentational + SSR-friendly: every chip is an `<a>`/<Link>
 * whose href the page computed from the current search params, so
 * filtering works without client JS and the URL stays shareable. The
 * page owns all the option/active/href logic; this component only
 * styles it.
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
      className={`mb-10 rounded-[var(--radius-card)] p-5 sm:p-6 ${dark ? "gh2-glass-forest gh2-filters-dark" : ""}`}
      style={
        dark
          ? undefined
          : {
              background: "rgba(255,255,255,0.78)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-card)",
            }
      }
    >
      {/* Header row — icon + title left, clear-all right (only when active). */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-flex size-8 items-center justify-center rounded-[10px]"
            style={{
              background: dark ? "rgba(176,241,34,0.10)" : "rgba(29,75,54,0.08)",
              border: dark ? "1px solid rgba(176,241,34,0.18)" : "1px solid rgba(29,75,54,0.10)",
              color: headingColor,
            }}
          >
            <SlidersHorizontal className="size-[14px]" strokeWidth={1.8} aria-hidden />
          </span>
          <span
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: dark ? "rgba(255,255,255,0.92)" : "var(--color-text-primary)" }}
          >
            Filters
            {activeCount > 0 ? (
              <span className="ml-1.5 tabular-nums" style={{ color: headingColor }}>
                · {activeCount}
              </span>
            ) : null}
          </span>
        </span>
        {hasActive ? (
          <Link
            href={clearHref}
            scroll={false}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-semibold transition-colors duration-150"
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

      <div className="flex flex-col gap-5">
        {visibleGroups.map((group) => (
          <div key={group.heading}>
            <p
              className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.16em]"
              style={{ color: headingColor }}
            >
              {group.heading}
            </p>
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
    </div>
  );
}

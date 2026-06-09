import Link from "next/link";

/**
 * Doctor directory filter bar (dark theme — sits at the top of the
 * DoctorTeamTemplate grid section, not in a stray white strip above
 * the hero).
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
  /** Short heading shown before the chips, e.g. "Speaks". */
  heading: string;
  options: FilterOption[];
};

export function DoctorFilters({
  groups,
  clearHref,
  hasActive,
  clearLabel,
}: {
  groups: FilterGroup[];
  clearHref: string;
  hasActive: boolean;
  clearLabel?: string;
}) {
  const visibleGroups = groups.filter((g) => g.options.length > 0);
  if (visibleGroups.length === 0) return null;

  return (
    <div
      className="mb-10 rounded-[var(--radius-card)] p-5 sm:p-6"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <div className="flex flex-col gap-4">
        {visibleGroups.map((group) => (
          <div key={group.heading} className="flex flex-wrap items-center gap-2">
            <span
              className="mr-1 text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: "var(--color-brand-accent)", minWidth: 64 }}
            >
              {group.heading}
            </span>
            {group.options.map((opt) => (
              <Link
                key={opt.token}
                href={opt.href}
                aria-pressed={opt.active}
                scroll={false}
                className="inline-flex items-center rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors duration-200 motion-reduce:transition-none"
                style={
                  opt.active
                    ? {
                        background: "var(--color-brand-accent)",
                        color: "#0a1f14",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.78)",
                        border: "1px solid rgba(255,255,255,0.14)",
                      }
                }
              >
                {opt.label}
              </Link>
            ))}
          </div>
        ))}

        {hasActive ? (
          <div>
            <Link
              href={clearHref}
              scroll={false}
              className="text-[12px] font-semibold underline decoration-dotted underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              {clearLabel ?? "Clear all filters"}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

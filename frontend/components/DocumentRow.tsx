import type { ReactNode } from "react";

export type DocumentRowDensity = "compact" | "consumer";

/**
 * DocumentRow — DESIGN.md §5.19. 32px file-kind icon tile (`--portal-well`
 * bg, glyph in `--portal-accent-text`), name + meta stack, optional status
 * pill, trailing actions slot. `density="consumer"` gives the Patient
 * variant its 52px min row height / ≥44px touch targets and lets a
 * "shared by Dr. X" style line sit in `meta`. Row content only — callers
 * own the list/table wrapper (desktop `<table>`, `<ul>`, or card stack).
 */
export function DocumentRow({
  icon,
  title,
  meta,
  statusPill,
  actions,
  density = "compact",
  className = "",
}: {
  /** Glyph rendered inside the 32px well tile — size/color are handled here. */
  icon: ReactNode;
  title: ReactNode;
  /** Meta line(s) under the title — e.g. "2.4 MB · Jul 3, 2026" or "Shared by Dr. X". */
  meta?: ReactNode;
  /** Rendered right of the title/meta block, before actions. */
  statusPill?: ReactNode;
  /** Trailing `IconBtn`s or other row-end controls. */
  actions?: ReactNode;
  /** "consumer" = Patient 52px row / ≥44px touch targets; "compact" = default table density. */
  density?: DocumentRowDensity;
  className?: string;
}) {
  return (
    <div
      className={`gh-document-row gh-document-row--${density} ${className}`}
    >
      <span className="gh-document-row__icon" aria-hidden>
        {icon}
      </span>
      <span className="gh-document-row__body">
        <span className="gh-document-row__title">{title}</span>
        {meta ? <span className="gh-document-row__meta">{meta}</span> : null}
      </span>
      {statusPill ? <span className="gh-document-row__pill">{statusPill}</span> : null}
      {actions ? <span className="gh-document-row__actions">{actions}</span> : null}
    </div>
  );
}

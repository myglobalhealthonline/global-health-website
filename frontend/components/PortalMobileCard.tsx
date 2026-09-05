import Link from "next/link";
import type { ReactNode } from "react";

export type PortalMobileCardMetaItem = { label: string; value: ReactNode };
export type PortalMobileCardTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand";

/**
 * PortalMobileCard — DESIGN.md §5.14. Replaces per-page `.gh-admin-mobile-card`
 * bodies below the 760px table breakpoint. White card, 3px status-tone left
 * edge, title row + status pill, meta grid, trailing action row.
 */
export function PortalMobileCard({
  leading,
  title,
  subtitle,
  statusPill,
  tone = "neutral",
  live = false,
  meta,
  actions,
  href,
  children,
}: {
  /** Optional avatar/icon rendered before the title block. */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Rendered top-right of the title row — typically a `Pill`. */
  statusPill?: ReactNode;
  /** Drives the 3px left edge color. */
  tone?: PortalMobileCardTone;
  /** True while a consultation is actively in progress — overrides `tone`
   *  with the lime signal edge + halo (DESIGN.md §5.20, mirrors
   *  AppointmentCard's desktop `live` state). */
  live?: boolean;
  meta?: PortalMobileCardMetaItem[];
  actions?: ReactNode;
  /** Makes the whole card a link (list → detail). Omit for an inline card
   *  that carries its own action buttons instead.
   *
   *  There is deliberately no whole-card click handler counterpart. A card
   *  body holds real controls (`actions`, `statusPill` menus, `children`
   *  forms), and giving that wrapper a button role is invalid ARIA
   *  (interactive descendants inside a button role), gives the wrapper an
   *  accessible name assembled from its children, and makes activation
   *  ambiguous for pointer and keyboard alike. Give the card an explicit
   *  native control in `actions` instead. */
  href?: string;
  /** Full-width freeform content below meta/actions — for embedded
   *  sub-components (e.g. an expandable ledger) that don't fit the
   *  right-aligned actions row. */
  children?: ReactNode;
}) {
  const content = (
    <>
      <div className="gh-portal-mobile-card__title-row">
        {leading ? <span className="gh-portal-mobile-card__leading">{leading}</span> : null}
        <span className="gh-portal-mobile-card__title-block">
          <span className="gh-portal-mobile-card__title">{title}</span>
          {subtitle ? (
            <span className="gh-portal-mobile-card__subtitle">{subtitle}</span>
          ) : null}
        </span>
        {statusPill ? <span className="shrink-0">{statusPill}</span> : null}
      </div>
      {meta && meta.length > 0 ? (
        <div className="gh-portal-mobile-card__meta">
          {meta.map((m, i) => (
            <span key={i} className="gh-portal-mobile-card__meta-item">
              <em>{m.label}</em>
              <strong>{m.value}</strong>
            </span>
          ))}
        </div>
      ) : null}
      {actions ? <div className="gh-portal-mobile-card__actions">{actions}</div> : null}
      {children}
    </>
  );

  const className = `gh-portal-mobile-card gh-portal-mobile-card--${tone}${
    live ? " gh-portal-mobile-card--live" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

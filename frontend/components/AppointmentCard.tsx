import Link from "next/link";
import type { ReactNode } from "react";

export type AppointmentCardTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand";

/**
 * AppointmentCard — DESIGN.md §5.20. Desktop row recipe shared by Doctor,
 * Admin, and Patient appointment lists: time block (tabular numerals + tz
 * meta) · person + service · status pill + action, with a 3px status-tone
 * left edge. `live` swaps the edge for the lime signal treatment plus a
 * halo glow while a consultation is in progress — the one animated state
 * on this recipe. Mobile stays on `PortalMobileCard` (same content order).
 */
export function AppointmentCard({
  time,
  timeMeta,
  person,
  service,
  statusPill,
  tone = "neutral",
  live = false,
  action,
  href,
}: {
  /** Primary time string, e.g. "14:30". Rendered tabular/bold. */
  time: ReactNode;
  /** Secondary line under the time — timezone label or "Unscheduled". */
  timeMeta?: ReactNode;
  /** Patient or doctor display name. */
  person: ReactNode;
  /** Consultation type / service label under the person name. */
  service?: ReactNode;
  /** Rendered in the status column — typically a `Pill`. */
  statusPill?: ReactNode;
  /** Drives the 3px left edge color when `live` is false. */
  tone?: AppointmentCardTone;
  /** True while the consultation is actively in progress — lime edge +
   *  halo instead of the status tone (DESIGN.md §5.20). */
  live?: boolean;
  /** Trailing action(s) — button(s) or link(s). */
  action?: ReactNode;
  /** Makes the whole row a link (list → detail). Omit when `action`
   *  already carries its own interactive elements. */
  href?: string;
}) {
  const content = (
    <>
      <div className="gh-appointment-card__time">
        <span className="gh-appointment-card__time-value">{time}</span>
        {timeMeta ? <span className="gh-appointment-card__time-meta">{timeMeta}</span> : null}
      </div>
      <div className="gh-appointment-card__person">
        <span className="gh-appointment-card__person-name">{person}</span>
        {service ? <span className="gh-appointment-card__service">{service}</span> : null}
      </div>
      <div className="gh-appointment-card__status">{statusPill}</div>
      {action ? <div className="gh-appointment-card__action">{action}</div> : null}
    </>
  );

  const className = `gh-appointment-card gh-appointment-card--${tone}${
    live ? " gh-appointment-card--live" : ""
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

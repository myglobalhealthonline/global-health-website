"use client";

import type { CSSProperties, ReactNode } from "react";
import { Ban, Clock, User } from "lucide-react";
import type { CalendarItem } from "./calendar-types";

/**
 * Status tones + the small corner affordances shared by every calendar surface
 * that draws a block: the week grid, the lane (resource) grid, and anything
 * added later. They lived inside WeekCalendar until the lane view needed the
 * exact same colours — two copies of "what does BLOCKED look like" is how the
 * surfaces drift apart.
 */

// Deep slate for booked appointments — darker than --portal-info so the white
// patient name reads with strong contrast. Tokenized (portal.css
// --portal-booked-fill) so it's defined once alongside the other status tones.
export const BOOKED_FILL = "var(--portal-booked-fill)";

// A solid, elevated block — used for every OCCUPIED state (booked, held,
// blocked) so it reads as a filled event, not empty space. `tone` is the base
// hex; text goes white and a shadow lifts it above the pale OPEN slots.
export function solidTone(tone: string): CSSProperties {
  return {
    borderColor: tone,
    background: tone,
    color: "#fff",
    boxShadow: "0 1px 4px rgba(16, 23, 19, 0.22)",
    fontWeight: 600,
    zIndex: 2,
  };
}

export function toneStyle(item: CalendarItem): CSSProperties {
  // Booked consultations are the thing an admin most needs to spot — solid fill.
  if (item.kind === "consultation") {
    return solidTone(BOOKED_FILL);
  }
  switch (item.status) {
    case "OPEN":
      // Available time recedes: pale, outline-forward, so booked blocks pop.
      return {
        borderColor: "var(--portal-success)",
        background: "var(--portal-success-soft)",
        color: "var(--portal-success-text)",
      };
    case "BLOCKED":
      return solidTone("var(--portal-danger)");
    case "BOOKED":
      return solidTone(BOOKED_FILL);
    default: // HELD
      return solidTone("var(--portal-warning)");
  }
}

// Slot status isn't color-only: a small glyph rides next to the time so
// color-blind users can tell BLOCKED/BOOKED/HELD apart without the legend.
// OPEN has no icon — its pale outline already reads as "empty".
export function statusIcon(status: string) {
  switch (status) {
    case "BLOCKED":
      return <Ban className="size-3 shrink-0" aria-hidden />;
    case "BOOKED":
      return <User className="size-3 shrink-0" aria-hidden />;
    case "HELD":
      return <Clock className="size-3 shrink-0" aria-hidden />;
    default:
      return null;
  }
}

/** Small icon button riding in a block's corner — the admin's
 *  block/remove/select affordances. Deliberately tiny (20px) so it fits even a
 *  15-min block's 40px span without covering the time label. */
export function CornerAction({
  label,
  title,
  disabled,
  pressed,
  onClick,
  children,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  /** Set for the selection checkbox — a ticked box has to look ticked. */
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={title}
      className="gh-week-block-action inline-flex size-5 items-center justify-center rounded-md border opacity-90 shadow-sm transition hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
      // Neutral surface, not another red fill: a danger-toned button on a
      // BLOCKED block's danger-toned fill was a red square on red.
      style={
        pressed
          ? {
              borderColor: "var(--portal-info)",
              background: "var(--portal-info)",
              color: "#fff",
            }
          : {
              borderColor: "var(--portal-line-strong)",
              background: "var(--portal-surface)",
              color: "var(--portal-danger)",
            }
      }
    >
      {children}
    </button>
  );
}

export function LegendDot({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}

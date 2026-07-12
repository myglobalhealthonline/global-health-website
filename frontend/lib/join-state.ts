// Shared "can this booking/slot be joined right now" gating — used by
// EventDetailDialog (calendar) and the patient bookings list/drawer so both
// surfaces agree on when a "Join call" control is shown.
//
// ponytail: role-agnostic status vocab — CONTACTED/BOOKED both mean
// "confirmed", COMPLETED means "ended", CANCELLED/BLOCKED both mean
// "unavailable". Covers patient consultations and admin/doctor slot items
// with one status set; extend the sets below if a new role/status appears.
const CONFIRMED_STATUSES = new Set(["CONTACTED", "BOOKED"]);
const ENDED_STATUSES = new Set(["COMPLETED"]);
const CANCELLED_STATUSES = new Set(["CANCELLED", "BLOCKED"]);
const JOIN_WINDOW_BEFORE_MS = 15 * 60 * 1000;
/** Fallback call length when the item carries no end time (consultations don't). */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

export type JoinState =
  | { kind: "ready" }
  | { kind: "no-link" }
  | { kind: "unconfirmed" }
  | { kind: "cancelled" }
  | { kind: "ended" }
  | { kind: "too-early"; opensAt: Date };

export function getJoinState(
  item: { status: string; meetingUrl?: string | null; startAt: string | null; endAt?: string | null },
  now: Date,
): JoinState {
  if (!item.meetingUrl) return { kind: "no-link" };
  if (CANCELLED_STATUSES.has(item.status)) return { kind: "cancelled" };
  if (ENDED_STATUSES.has(item.status)) return { kind: "ended" };
  if (!CONFIRMED_STATUSES.has(item.status)) return { kind: "unconfirmed" };
  if (!item.startAt) return { kind: "unconfirmed" };

  const start = new Date(item.startAt);
  const end = item.endAt ? new Date(item.endAt) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  const opensAt = new Date(start.getTime() - JOIN_WINDOW_BEFORE_MS);
  if (now < opensAt) return { kind: "too-early", opensAt };
  if (now > end) return { kind: "ended" };
  return { kind: "ready" };
}

"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * `<input type="datetime-local">` for a consultation slot, edited in the
 * CLINIC's timezone — the zone the country the consultation is booked in runs
 * on — not the admin's own.
 *
 * A datetime-local input carries no zone, so the pair (wall clock, offset) is
 * what makes the value unambiguous. This component owns both halves:
 *
 *   - the visible input, prefilled from the stored UTC instant rendered in
 *     `timeZone`;
 *   - the hidden `scheduledAtTzOffset` field, holding minutes WEST of UTC for
 *     the wall clock currently typed, resolved in `timeZone`. The server
 *     action adds it back (`asUtcEpoch + offset * 60_000`), so the instant it
 *     stores is the one the clinic means.
 *
 * The offset is derived from the ENTERED value rather than from "now", so a
 * booking on the far side of a DST change converts on its own rules. Passing
 * no `timeZone` keeps the old behaviour (the admin's browser zone), which is
 * what a caller with no country context should use.
 *
 * Value is set on the client: SSR renders it empty so the Node server's own
 * timezone can never leak into the field.
 */
type Props = {
  name: string;
  initialIso?: string | null;
  /** IANA clinic zone, e.g. "Europe/Prague". Omit to edit in browser time. */
  timeZone?: string | null;
  /** Optional id of the parent <form> when rendered outside of it. */
  formId?: string;
};

const OFFSET_FIELD = "scheduledAtTzOffset";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Minutes EAST of UTC that `tz` is running at `instant` (DST-correct). */
function zoneOffsetMinutesEast(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const p: Record<string, string> = {};
  for (const part of parts) if (part.type !== "literal") p[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    // en-US hour12:false renders midnight as "24" in some engines.
    Number(p.hour) % 24,
    Number(p.minute),
    Number(p.second),
  );
  return (asUtc - instant.getTime()) / 60_000;
}

function isoToZonedInput(iso: string, tz: string | null | undefined): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (!tz) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;
  }
  const east = zoneOffsetMinutesEast(d, tz);
  const wall = new Date(d.getTime() + east * 60_000);
  return `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(
    wall.getUTCDate(),
  )}T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`;
}

/**
 * Minutes WEST of UTC for the typed wall clock, matching what
 * `Date.prototype.getTimezoneOffset()` would report — the shape the server
 * action already expects.
 *
 * Resolved in two passes: the first offset is read at the naive instant, the
 * second at the corrected one, so a time inside a DST transition lands on the
 * offset actually in force then.
 */
function offsetMinutesWest(wallClock: string, tz: string): number | null {
  const naive = Date.parse(`${wallClock}:00Z`);
  if (!Number.isFinite(naive)) return null;
  let east = zoneOffsetMinutesEast(new Date(naive), tz);
  east = zoneOffsetMinutesEast(new Date(naive - east * 60_000), tz);
  return -east;
}

export function ScheduleSlotInput({ name, initialIso, timeZone, formId }: Props) {
  const ref = useRef<HTMLInputElement | null>(null);
  const offsetRef = useRef<HTMLInputElement | null>(null);

  const syncOffset = useCallback(() => {
    if (!offsetRef.current) return;
    const value = ref.current?.value ?? "";
    if (!timeZone) {
      offsetRef.current.value = String(new Date().getTimezoneOffset());
      return;
    }
    const west = value ? offsetMinutesWest(value, timeZone) : null;
    // An empty or half-typed field clears the slot server-side, so the offset
    // it carries is irrelevant — keep the zone's current one rather than 0,
    // which would silently mean UTC.
    offsetRef.current.value = String(
      west ?? offsetMinutesWest(isoToZonedInput(new Date().toISOString(), timeZone), timeZone) ?? 0,
    );
  }, [timeZone]);

  // Set the initial value on mount. defaultValue="" means SSR renders
  // an empty input (no server-tz leakage); the client then fills it
  // in the clinic's time before paint.
  useEffect(() => {
    if (!ref.current) return;
    ref.current.value = initialIso ? isoToZonedInput(initialIso, timeZone) : "";
    syncOffset();
  }, [initialIso, timeZone, syncOffset]);

  return (
    <>
      <input
        ref={ref}
        type="datetime-local"
        name={name}
        className="gh-input gh-admin-appointment-slot-input"
        defaultValue=""
        onChange={syncOffset}
        {...(formId ? { form: formId } : {})}
      />
      <input
        ref={offsetRef}
        type="hidden"
        name={OFFSET_FIELD}
        defaultValue="0"
        {...(formId ? { form: formId } : {})}
      />
    </>
  );
}

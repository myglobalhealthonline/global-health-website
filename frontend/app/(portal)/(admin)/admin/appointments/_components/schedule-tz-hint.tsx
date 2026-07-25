"use client";

import { useSyncExternalStore } from "react";

/**
 * Timezone caption for the reschedule `<input type="datetime-local">`.
 *
 * A datetime-local input renders a bare wall clock with no zone attached,
 * so an admin in Lisbon and an admin in Bucharest read the same field as
 * two different instants. This spells out the three zones that matter:
 *
 *   - the admin's own browser zone, which is what the input is showing
 *     and editing (ScheduleSlotInput prefills from it, and the server
 *     action converts back using ScheduleTzOffsetInput's offset);
 *   - the clinic zone the rest of admin renders in (Europe/Dublin, the
 *     `formatAppDateTime` default) — the number the summary tile shows;
 *   - the patient's own zone captured at booking, when we have it and it
 *     differs from the clinic's.
 *
 * The browser-zone line is filled on mount rather than during SSR: the
 * server has no way to know the admin's zone, and rendering a guess would
 * hydrate-mismatch.
 */

const CLINIC_TZ = "Europe/Dublin";
const DISPLAY_LOCALE = "en-IE";

function cityOf(tz: string): string {
  return tz.includes("/") ? tz.slice(tz.lastIndexOf("/") + 1).replace(/_/g, " ") : tz;
}

/** "GMT+1" for `tz` at `at` — DST-correct because it is resolved on the
 *  appointment's own instant, not on today's. */
function offsetOf(at: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  }).formatToParts(at);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

function timeIn(at: Date, tz: string): string {
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: tz,
  }).format(at);
}

/** Never fires — the browser zone can't change mid-page. */
function subscribeNever() {
  return () => {};
}

function getBrowserTz(): string | null {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
}

export function ScheduleTzHint({
  iso,
  patientTimezone,
}: {
  iso: string | null;
  patientTimezone?: string | null;
}) {
  // The browser zone is a client-only value that never changes for the life
  // of the page: read it through useSyncExternalStore so the server snapshot
  // stays null (matching SSR) without a setState-in-effect round trip.
  const browserTz = useSyncExternalStore(subscribeNever, getBrowserTz, () => null);

  const at = iso ? new Date(iso) : null;
  const valid = at && !Number.isNaN(at.getTime()) ? at : null;

  return (
    <span className="gh-admin-schedule-tz-hint">
      <span>
        {browserTz
          ? `Editing in your local time — ${cityOf(browserTz)} (${valid ? offsetOf(valid, browserTz) : offsetOf(new Date(), browserTz)}).`
          : "Editing in your local time."}
      </span>
      {valid ? (
        <span>
          Booked for <strong>{timeIn(valid, CLINIC_TZ)}</strong> clinic time (
          {cityOf(CLINIC_TZ)}, {offsetOf(valid, CLINIC_TZ)}).
        </span>
      ) : (
        <span>No time booked yet.</span>
      )}
      {valid && patientTimezone && patientTimezone !== CLINIC_TZ ? (
        <span>
          Patient booked from {cityOf(patientTimezone)} — {timeIn(valid, patientTimezone)}{" "}
          their time ({offsetOf(valid, patientTimezone)}).
        </span>
      ) : null}
    </span>
  );
}

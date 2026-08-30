"use client";

import { useSyncExternalStore } from "react";

/**
 * Timezone caption for the reschedule `<input type="datetime-local">`.
 *
 * A datetime-local input renders a bare wall clock with no zone attached,
 * so an admin in Lisbon and an admin in Bucharest read the same field as
 * two different instants. The field is edited in the CLINIC's zone
 * (`ScheduleSlotInput` prefills from it and ships the matching offset), and
 * this caption spells out the zones that matter:
 *
 *   - the clinic zone being edited in, named and offset;
 *   - the admin's own browser zone, so they can sanity-check the number
 *     against their own clock;
 *   - the clinic zone this booking's country is run in (its
 *     `BookingSetting.timezone`) — the number the summary tile shows. It was
 *     hardcoded to Europe/Dublin, which captioned a Czech or Brazilian
 *     booking in Irish time;
 *   - the patient's own zone captured at booking, when we have it and it
 *     differs from the clinic's.
 *
 * The browser-zone line is filled on mount rather than during SSR: the
 * server has no way to know the admin's zone, and rendering a guess would
 * hydrate-mismatch.
 */

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
  clinicTimezone,
}: {
  iso: string | null;
  patientTimezone?: string | null;
  /** The booking country's own clinic zone — pass
   *  `bookingTimezoneForCountry(countryCode)`. */
  clinicTimezone: string;
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
        Editing in clinic time — {cityOf(clinicTimezone)} (
        {valid ? offsetOf(valid, clinicTimezone) : offsetOf(new Date(), clinicTimezone)}).
      </span>
      {valid ? (
        <span>
          Booked for <strong>{timeIn(valid, clinicTimezone)}</strong> clinic time
          {browserTz && browserTz !== clinicTimezone ? (
            <>
              {" "}
              — {timeIn(valid, browserTz)} your time ({cityOf(browserTz)},{" "}
              {offsetOf(valid, browserTz)})
            </>
          ) : null}
          .
        </span>
      ) : (
        <span>No time booked yet.</span>
      )}
      {valid && patientTimezone && patientTimezone !== clinicTimezone ? (
        <span>
          Patient booked from {cityOf(patientTimezone)} — {timeIn(valid, patientTimezone)}{" "}
          their time ({offsetOf(valid, patientTimezone)}).
        </span>
      ) : null}
    </span>
  );
}

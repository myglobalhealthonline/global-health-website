"use client";

import { useState } from "react";
import { PortalDialog } from "@/components/PortalDialog";
import { BASE_SLOT_MINUTES } from "@/lib/constants";
import { zonedLocalDateTimeToUtc } from "./calendar-utils";

/** Hard cap mirroring the API's per-request bound. */
const MAX_SLOTS = 2000;

/** Every "YYYY-MM-DD" from `from` to `to` inclusive. Empty if the range is
 *  inverted or unparseable. Iterates in UTC so DST can't skip or repeat a day —
 *  these are calendar dates, not instants. */
function eachDate(from: string, to: string): string[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const out: string[] = [];
  for (let t = start; t <= end; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
    if (out.length > 366) break;
  }
  return out;
}

/** Minutes since midnight for "HH:mm"; null when unparseable. */
function toMinutes(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const mins = Number(m[1]) * 60 + Number(m[2]);
  return mins >= 0 && mins <= 24 * 60 ? mins : null;
}

function hhmm(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Expand a date range + daily time range into the UTC instants each
 * base-grid slot starts at, or the reason the range can't be used.
 */
function expandRange(
  fromDate: string,
  toDate: string,
  startTime: string,
  endTime: string,
  tz: string,
): { instants: string[]; problem: string | null } {
  const dates = eachDate(fromDate, toDate);
  if (dates.length === 0) {
    return { instants: [], problem: "End date must be on or after the start date." };
  }
  const startMin = toMinutes(startTime);
  const endMin = toMinutes(endTime);
  if (startMin === null || endMin === null) {
    return { instants: [], problem: "Enter times as HH:MM." };
  }
  // "00:00" as an end time means midnight/end-of-day, not minute zero —
  // otherwise an evening clinic running to midnight fails this guard.
  const end = endMin === 0 ? 24 * 60 : endMin;
  if (end - startMin < BASE_SLOT_MINUTES) {
    return {
      instants: [],
      problem: `End time must be at least ${BASE_SLOT_MINUTES} minutes after the start time.`,
    };
  }
  const out: string[] = [];
  for (const date of dates) {
    for (let m = startMin; m + BASE_SLOT_MINUTES <= end; m += BASE_SLOT_MINUTES) {
      const iso = zonedLocalDateTimeToUtc(`${date}T${hhmm(m)}`, tz);
      if (iso) out.push(iso);
      if (out.length > MAX_SLOTS) {
        return {
          instants: [],
          problem: `That range is over ${MAX_SLOTS} slots — add it in smaller batches.`,
        };
      }
    }
  }
  return { instants: out, problem: null };
}

/**
 * Plain-English summary of what an add actually did. Skips are normal (a range
 * crosses times the doctor already has), so they belong in the success line
 * rather than being swallowed or dressed up as an error.
 */
export function describeAddResult(result: {
  created: number;
  skippedOverlap: number;
  skippedPast: number;
}): string {
  const parts = [
    `Added ${result.created} slot${result.created === 1 ? "" : "s"}.`,
  ];
  if (result.skippedOverlap > 0) {
    parts.push(
      `${result.skippedOverlap} skipped — already booked, blocked, or covered by an existing slot.`,
    );
  }
  if (result.skippedPast > 0) {
    parts.push(`${result.skippedPast} skipped — in the past.`);
  }
  return parts.join(" ");
}

/**
 * Admin: add slots over a date range and a daily time range, with no reference
 * to the doctor's recurring weekly windows. Slot length is the product-wide
 * base grid (15 min) — consultations consume consecutive base slots to fit
 * their real length, so there is nothing to choose here.
 *
 * Times are entered in whichever timezone the calendar is displaying and
 * expanded to UTC instants here, so the API never has to guess a zone.
 */
export function AddSlotDialog({
  open,
  doctorName,
  tz,
  defaultDate,
  busy = false,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  /** Named in the title when the surface knows which doctor it's adding for. */
  doctorName?: string | null;
  tz: string;
  /** "YYYY-MM-DD" both date fields start on — usually the week being viewed. */
  defaultDate: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (startAtIsos: string[], durationMinutes: number) => void;
}) {
  const [fromDate, setFromDate] = useState(defaultDate);
  const [toDate, setToDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [localError, setLocalError] = useState<string | null>(null);

  // Expanded up front so the button can state exactly what it will create —
  // "Add 224 slots" is a very different click from "Add 4 slots". Plain call,
  // no useMemo: the React Compiler memoizes it, and a hand-rolled useMemo here
  // reads as un-memoizable to the lint rule.
  const { instants, problem } = expandRange(fromDate, toDate, startTime, endTime, tz);

  function submit() {
    if (problem) {
      setLocalError(problem);
      return;
    }
    if (instants.length === 0) {
      setLocalError("That range produces no slots.");
      return;
    }
    setLocalError(null);
    onConfirm(instants, BASE_SLOT_MINUTES);
  }

  return (
    <PortalDialog
      open={open}
      onClose={onClose}
      width="lg"
      title={doctorName ? `Add slots — ${doctorName}` : "Add slots"}
    >
      <div className="grid gap-4">
        <p className="text-portal-compact text-[var(--color-text-body)]">
          Creates bookable slots on these dates only, on the fixed{" "}
          {BASE_SLOT_MINUTES}-minute grid. The doctor&apos;s recurring weekly
          windows are not changed, and these slots stay put even if those windows
          are edited later. Times that already have a slot are skipped.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">From date *</span>
            <input
              type="date"
              className="gh-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                // Keep the range valid as the admin types rather than scolding
                // them for an end date that was fine a keystroke ago.
                if (toDate && e.target.value > toDate) setToDate(e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">To date *</span>
            <input
              type="date"
              className="gh-input"
              min={fromDate || undefined}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">From time *</span>
            <input
              type="time"
              className="gh-input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">To time *</span>
            <input
              type="time"
              className="gh-input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

        <p className="text-portal-meta text-[var(--color-text-muted)]">
          Entered in <strong>{tz}</strong> — the timezone this calendar is
          showing. Each slot is {BASE_SLOT_MINUTES} minutes; a longer
          consultation consumes consecutive slots.
        </p>

        {localError || problem || error ? (
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
            {localError ?? problem ?? error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="gh-btn gh-btn-ghost"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="gh-btn gh-btn-primary"
            disabled={busy || instants.length === 0}
          >
            {busy
              ? "Adding…"
              : `Add ${instants.length} slot${instants.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </PortalDialog>
  );
}

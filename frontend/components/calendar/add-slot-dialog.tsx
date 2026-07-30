"use client";

import { useState } from "react";
import { PortalDialog } from "@/components/PortalDialog";
import { zonedLocalDateTimeToUtc } from "./calendar-utils";

/** Bookable lengths, matching the manual-booking dialog's options. */
const DURATION_OPTIONS = [15, 30, 45, 60];

/**
 * Admin: add ONE slot at a specific date + time, with no reference to the
 * doctor's recurring weekly windows. Times are entered in whichever timezone
 * the calendar is currently displaying and converted to a UTC instant here, so
 * the API never has to guess a zone.
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
  /** "YYYY-MM-DD" the date field starts on — usually the week being viewed. */
  defaultDate: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (startAtIso: string, durationMinutes: number) => void;
}) {
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(15);
  const [localError, setLocalError] = useState<string | null>(null);

  function submit() {
    if (!date || !time) {
      setLocalError("Pick a date and a time.");
      return;
    }
    const startAtIso = zonedLocalDateTimeToUtc(`${date}T${time}`, tz);
    if (!startAtIso) {
      setLocalError("That date and time couldn't be read.");
      return;
    }
    setLocalError(null);
    onConfirm(startAtIso, duration);
  }

  return (
    <PortalDialog
      open={open}
      onClose={onClose}
      title={doctorName ? `Add slot — ${doctorName}` : "Add slot"}
    >
      <div className="grid gap-4">
        <p className="text-portal-compact text-[var(--color-text-body)]">
          Creates a single bookable slot on this date only. The doctor&apos;s
          recurring weekly windows are not changed, and this slot stays put even
          if those windows are edited later.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Date *</span>
            <input
              type="date"
              className="gh-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Start time *</span>
            <input
              type="time"
              className="gh-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Duration *</span>
            <select
              className="gh-select"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col justify-end">
            <span className="text-portal-meta text-[var(--color-text-muted)]">
              Entered in <strong>{tz}</strong> — the timezone this calendar is
              showing.
            </span>
          </div>
        </div>

        {localError || error ? (
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
            {localError ?? error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
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
            disabled={busy}
          >
            {busy ? "Adding…" : "Add slot"}
          </button>
        </div>
      </div>
    </PortalDialog>
  );
}

"use client";

import { useState } from "react";
import { PortalDialog } from "@/components/PortalDialog";
import { BASE_SLOT_MINUTES } from "@/lib/constants";
import {
  countRangeSlots,
  expandSlotStarts,
  toMinutes,
  type RangeProblem,
} from "@/lib/calendar/expand-range";

/**
 * One way in for "I'm available then", replacing the two forms that used to sit
 * on two different pages doing almost the same thing.
 *
 * The mode is the real distinction, and it is the first thing you pick:
 *   • Repeats weekly → writes DoctorAvailability windows. Slots regenerate from
 *     them forever (or between the optional dates), which is how a normal
 *     schedule is expressed.
 *   • Specific dates → writes concrete ad-hoc slots for those dates only. They
 *     survive later edits to the weekly windows, which is exactly what a
 *     one-off extra clinic needs.
 */

export type AddAvailabilityLabels = {
  title: string;
  modeWeekly: string;
  modeDates: string;
  weeklyIntro: string;
  datesIntro: string;
  days: string;
  fromTime: string;
  toTime: string;
  fromDate: string;
  toDate: string;
  startsOptional: string;
  endsOptional: string;
  datesHint: string;
  gridHint: string;
  timezoneHint: string;
  cancel: string;
  confirmWeekly: string;
  confirmDates: string;
  busy: string;
  errorPickDay: string;
  errorEndAfterStart: string;
  errorEndDateAfterStart: string;
  errorTimeFormat: string;
  errorTooMany: string;
};

export const DEFAULT_ADD_AVAILABILITY_LABELS: AddAvailabilityLabels = {
  title: "Add availability",
  modeWeekly: "Repeats weekly",
  modeDates: "Specific dates",
  weeklyIntro:
    "Pick the days you work and the hours you work them. Slots are generated on the {minutes}-minute grid and keep regenerating week after week.",
  datesIntro:
    "Slots on these dates only, on the {minutes}-minute grid. Nothing repeats, and these slots stay put even if your weekly hours change later.",
  days: "Days",
  fromTime: "From time",
  toTime: "To time",
  fromDate: "From date",
  toDate: "To date",
  startsOptional: "Starts (optional)",
  endsOptional: "Ends (optional)",
  datesHint: "Leave the dates blank to repeat forever.",
  gridHint:
    "Each slot is {minutes} minutes; a longer consultation takes consecutive slots.",
  timezoneHint: "Times are in {tz}.",
  cancel: "Cancel",
  confirmWeekly: "Add {count} days",
  confirmDates: "Add {count} slots",
  busy: "Adding…",
  errorPickDay: "Pick at least one day.",
  errorEndAfterStart: "End time must be after the start time.",
  errorEndDateAfterStart: "End date must be on or after the start date.",
  errorTimeFormat: "Enter times as HH:MM.",
  errorTooMany: "That range is too big — add it in smaller batches.",
};

export type WeeklySubmit = {
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  effectiveFrom: string;
  effectiveUntil: string;
};

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (out, [key, value]) => out.split(`{${key}}`).join(String(value)),
    template,
  );
}

export function AddAvailabilityDialog({
  open,
  tz,
  defaultDate,
  weekdayLabels,
  busy = false,
  error,
  labels,
  describeConflict,
  onClose,
  onSubmitWeekly,
  onSubmitDates,
}: {
  open: boolean;
  tz: string;
  /** "YYYY-MM-DD" the date fields start on. */
  defaultDate: string;
  /** Sunday-first, matching `Date#getDay()` and the weekday column in the DB. */
  weekdayLabels: string[];
  busy?: boolean;
  error?: string | null;
  labels?: Partial<AddAvailabilityLabels>;
  /** Optional heads-up while the weekly form is filled in — the caller knows
   *  the existing windows. Warns, never blocks: a temporary extra clinic that
   *  overlaps the usual hours is legitimate. */
  describeConflict?: (
    weekdays: number[],
    startMinute: number,
    endMinute: number,
    effectiveFrom: string,
    effectiveUntil: string,
  ) => string | null;
  onClose: () => void;
  onSubmitWeekly: (input: WeeklySubmit) => void;
  onSubmitDates: (startAtIsos: string[], durationMinutes: number) => void;
}) {
  const [mode, setMode] = useState<"weekly" | "dates">("weekly");
  // Weekdays start empty and times start blank: a prefilled Mon 09:00–17:00
  // reads as a choice the doctor already made, so a stray submit would publish
  // office hours nobody picked.
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [fromDate, setFromDate] = useState(defaultDate);
  const [toDate, setToDate] = useState(defaultDate);
  const [localError, setLocalError] = useState<string | null>(null);

  const t = { ...DEFAULT_ADD_AVAILABILITY_LABELS, ...labels };

  const dateCount = countRangeSlots(fromDate, toDate, startTime, endTime);

  // Recomputed each render rather than memoised: it is a couple of array scans
  // over the doctor's own windows, and the React Compiler handles the rest.
  const conflict = (() => {
    if (mode !== "weekly" || !describeConflict || weekdays.length === 0) return null;
    const startMin = toMinutes(startTime);
    const rawEnd = toMinutes(endTime);
    if (startMin === null || rawEnd === null) return null;
    const endMin = rawEnd === 0 ? 24 * 60 : rawEnd;
    if (endMin <= startMin) return null;
    return describeConflict(weekdays, startMin, endMin, effectiveFrom, effectiveUntil);
  })();

  function toggleWeekday(value: number) {
    setWeekdays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  function problemMessage(problem: RangeProblem): string {
    switch (problem) {
      case "END_DATE_BEFORE_START":
        return t.errorEndDateAfterStart;
      case "BAD_TIME":
        return t.errorTimeFormat;
      case "TOO_SHORT":
        return t.errorEndAfterStart;
      default:
        return t.errorTooMany;
    }
  }

  function submit() {
    const startMin = toMinutes(startTime);
    const rawEnd = toMinutes(endTime);
    if (startMin === null || rawEnd === null) {
      setLocalError(t.errorTimeFormat);
      return;
    }
    // Midnight as an end time means end-of-day, not minute zero.
    const endMin = rawEnd === 0 ? 24 * 60 : rawEnd;
    if (endMin - startMin < BASE_SLOT_MINUTES) {
      setLocalError(t.errorEndAfterStart);
      return;
    }

    if (mode === "weekly") {
      if (weekdays.length === 0) {
        setLocalError(t.errorPickDay);
        return;
      }
      if (effectiveFrom && effectiveUntil && effectiveFrom > effectiveUntil) {
        setLocalError(t.errorEndDateAfterStart);
        return;
      }
      setLocalError(null);
      onSubmitWeekly({
        weekdays: [...weekdays].sort((a, b) => a - b),
        startMinute: startMin,
        endMinute: endMin,
        effectiveFrom,
        effectiveUntil,
      });
      return;
    }

    const { instants, problem } = expandSlotStarts(
      fromDate,
      toDate,
      startTime,
      endTime,
      tz,
    );
    if (problem) {
      setLocalError(problemMessage(problem));
      return;
    }
    if (instants.length === 0) {
      setLocalError(t.errorEndDateAfterStart);
      return;
    }
    setLocalError(null);
    onSubmitDates(instants, BASE_SLOT_MINUTES);
  }

  return (
    <PortalDialog open={open} onClose={onClose} width="lg" title={t.title}>
      <div className="grid gap-4">
        {/* Mode first: it changes what the rest of the form means. */}
        <div
          role="group"
          className="inline-flex w-fit items-center gap-0.5 rounded-[999px] p-0.5"
          style={{ border: "1px solid var(--portal-line-strong)" }}
        >
          {(["weekly", "dates"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className="rounded-[999px] px-3 py-1 text-xs font-semibold"
              style={
                mode === m
                  ? { background: "var(--portal-info)", color: "#fff" }
                  : { color: "var(--portal-text)" }
              }
            >
              {m === "weekly" ? t.modeWeekly : t.modeDates}
            </button>
          ))}
        </div>

        <p className="text-portal-compact text-[var(--color-text-body)]">
          {fill(mode === "weekly" ? t.weeklyIntro : t.datesIntro, {
            minutes: BASE_SLOT_MINUTES,
          })}
        </p>

        {mode === "weekly" ? (
          <fieldset className="grid gap-1.5">
            <legend className="gh-field-label mb-1">{t.days}</legend>
            <div className="flex flex-wrap gap-1.5">
              {weekdayLabels.map((label, value) => {
                const on = weekdays.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleWeekday(value)}
                    aria-pressed={on}
                    className="rounded-[999px] border px-3 py-1.5 text-portal-compact font-semibold transition"
                    style={
                      on
                        ? {
                            borderColor: "var(--portal-info)",
                            background: "var(--portal-info)",
                            color: "#fff",
                          }
                        : {
                            borderColor: "var(--portal-line-strong)",
                            color: "var(--portal-text)",
                          }
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">{t.fromDate} *</span>
              <input
                type="date"
                className="gh-input"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (toDate && e.target.value > toDate) setToDate(e.target.value);
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">{t.toDate} *</span>
              <input
                type="date"
                className="gh-input"
                min={fromDate || undefined}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">{t.fromTime} *</span>
            <input
              type="time"
              className="gh-input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">{t.toTime} *</span>
            <input
              type="time"
              className="gh-input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

        {mode === "weekly" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">{t.startsOptional}</span>
                <input
                  type="date"
                  className="gh-input"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="gh-field-label">{t.endsOptional}</span>
                <input
                  type="date"
                  className="gh-input"
                  value={effectiveUntil}
                  onChange={(e) => setEffectiveUntil(e.target.value)}
                />
              </label>
            </div>
            <p className="text-portal-meta text-[var(--color-text-muted)]">
              {t.datesHint}
            </p>
          </>
        ) : null}

        <p className="text-portal-meta text-[var(--color-text-muted)]">
          {fill(t.gridHint, { minutes: BASE_SLOT_MINUTES })}{" "}
          {fill(t.timezoneHint, { tz })}
        </p>

        {conflict ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {conflict}
          </p>
        ) : null}

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
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            className="gh-btn gh-btn-primary"
            disabled={busy}
          >
            {busy
              ? t.busy
              : mode === "weekly"
                ? fill(t.confirmWeekly, { count: weekdays.length })
                : fill(t.confirmDates, { count: dateCount })}
          </button>
        </div>
      </div>
    </PortalDialog>
  );
}

"use client";

import { useState } from "react";
import { Ban, Trash2, Unlock } from "lucide-react";
import { FormSection } from "@/components/FormSection";
import { BASE_SLOT_MINUTES } from "@/lib/constants";
import type { BulkSlotAction } from "@/lib/api/slot-bulk-types";
import {
  countRangeSlots,
  expandDaySpans,
  type RangeProblem,
} from "@/lib/calendar/expand-range";

export type SlotManagerLabels = {
  title: string;
  description: string;
  days: string;
  anyDay: string;
  fromDate: string;
  toDate: string;
  fromTime: string;
  toTime: string;
  datesOptionalHint: string;
  reason: string;
  reasonPlaceholder: string;
  block: string;
  unblock: string;
  remove: string;
  busy: string;
  affects: string;
  removeConfirm: string;
  errorEndDate: string;
  errorNoMatchingDays: string;
  errorTimeFormat: string;
  errorTooShort: string;
  errorTooMany: string;
};

const DEFAULT_LABELS: SlotManagerLabels = {
  title: "Manage slots",
  description:
    "Block, re-open, or remove a stretch of the calendar at once. Booked slots are never touched. Times are in {tz}.",
  days: "Days",
  anyDay: "Every day",
  fromDate: "From date",
  toDate: "To date",
  fromTime: "From time",
  toTime: "To time",
  datesOptionalHint: "Leave the dates blank to use the dates you are looking at ({from} – {to}).",
  reason: "Reason",
  reasonPlaceholder: "Holiday, training, clinic closed…",
  block: "Block",
  unblock: "Re-open",
  remove: "Remove",
  busy: "Working…",
  affects: "Covers up to {count} slots.",
  removeConfirm:
    "Remove every open and blocked slot in that stretch? They will not come back on their own — the weekly windows stay, but these dates are permanently excluded.",
  errorEndDate: "End date must be on or after the start date.",
  errorNoMatchingDays: "No days of the week you picked fall inside those dates.",
  errorTimeFormat: "Enter times as HH:MM.",
  errorTooShort: "End time must be at least {minutes} minutes after the start time.",
  errorTooMany: "That range is too big — do it in smaller batches.",
};

function problemMessage(problem: RangeProblem, t: SlotManagerLabels): string {
  switch (problem) {
    case "END_DATE_BEFORE_START":
      return t.errorEndDate;
    case "NO_MATCHING_DAYS":
      return t.errorNoMatchingDays;
    case "BAD_TIME":
      return t.errorTimeFormat;
    case "TOO_SHORT":
      return t.errorTooShort.split("{minutes}").join(String(BASE_SLOT_MINUTES));
    default:
      return t.errorTooMany;
  }
}

/**
 * The range sweep: block, re-open, or remove a stretch of the calendar in one
 * go. This is the "I'm away next week" path; the grid's own per-slot actions
 * and multi-select cover the fiddly cases.
 *
 * Both narrowing controls are optional and compose:
 *   • dates — blank means the range currently on screen, so the panel acts on
 *     what the doctor is looking at rather than demanding they retype it;
 *   • days of the week — blank means every day, otherwise "only the Mondays
 *     and Wednesdays in that stretch".
 *
 * The panel only expands the choice into UTC day-spans and hands them up, so
 * the same component serves the doctor portal and both admin surfaces.
 */
export function SlotManagerPanel({
  tz,
  fallbackFrom,
  fallbackTo,
  weekdayLabels,
  busy = false,
  labels,
  onSubmit,
  dataTour,
}: {
  tz: string;
  /** "YYYY-MM-DD" used when the date fields are left blank — the visible range. */
  fallbackFrom: string;
  fallbackTo: string;
  /** Sunday-first, matching `Date#getDay()`. */
  weekdayLabels: string[];
  busy?: boolean;
  labels?: Partial<SlotManagerLabels>;
  onSubmit: (
    action: BulkSlotAction,
    spans: { fromUtc: string; toUtc: string }[],
    reason: string,
  ) => void;
  dataTour?: string;
}) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const t = { ...DEFAULT_LABELS, ...labels };
  const effectiveFrom = fromDate || fallbackFrom;
  const effectiveTo = toDate || fallbackTo;
  const affected = countRangeSlots(
    effectiveFrom,
    effectiveTo,
    startTime,
    endTime,
    weekdays,
  );

  function toggleWeekday(value: number) {
    setWeekdays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value],
    );
  }

  function submit(action: BulkSlotAction) {
    const { spans, problem } = expandDaySpans(
      effectiveFrom,
      effectiveTo,
      startTime,
      endTime,
      tz,
      weekdays,
    );
    if (problem) {
      setError(problemMessage(problem, t));
      return;
    }
    if (spans.length === 0) {
      setError(t.errorEndDate);
      return;
    }
    // Removal is the one irreversible action here, and a mis-set range is the
    // easy mistake — confirm before a sweep deletes a week of inventory.
    if (action === "REMOVE" && !window.confirm(t.removeConfirm)) return;
    setError(null);
    onSubmit(action, spans, reason.trim());
  }

  return (
    <FormSection
      title={t.title}
      description={t.description.split("{tz}").join(tz)}
      className="gh-doctor-panel"
    >
      <div className="gh-form-section__span-2 grid gap-3" data-tour={dataTour}>
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
                  className="rounded-[999px] border px-2.5 py-1 text-portal-compact font-semibold transition"
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
          {weekdays.length === 0 ? (
            <span className="text-portal-meta text-[var(--portal-muted)]">{t.anyDay}</span>
          ) : null}
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">{t.fromDate}</span>
            <input
              type="date"
              className="gh-input h-10"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                if (toDate && e.target.value && e.target.value > toDate) {
                  setToDate(e.target.value);
                }
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">{t.toDate}</span>
            <input
              type="date"
              className="gh-input h-10"
              min={fromDate || undefined}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>
        <p className="text-portal-meta text-[var(--portal-muted)]">
          {t.datesOptionalHint
            .split("{from}")
            .join(fallbackFrom)
            .split("{to}")
            .join(fallbackTo)}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">{t.fromTime}</span>
            <input
              type="time"
              className="gh-input h-10"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">{t.toTime}</span>
            <input
              type="time"
              className="gh-input h-10"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="gh-field-label">{t.reason}</span>
          <input
            type="text"
            className="gh-input h-10"
            maxLength={200}
            placeholder={t.reasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>

        <p className="text-portal-meta text-[var(--portal-muted)]">
          {t.affects.split("{count}").join(String(affected))}
        </p>

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <ActionButton disabled={busy} onClick={() => submit("BLOCK")}>
            <Ban className="size-3.5" aria-hidden /> {busy ? t.busy : t.block}
          </ActionButton>
          <ActionButton disabled={busy} onClick={() => submit("UNBLOCK")}>
            <Unlock className="size-3.5" aria-hidden /> {t.unblock}
          </ActionButton>
          <ActionButton danger disabled={busy} onClick={() => submit("REMOVE")}>
            <Trash2 className="size-3.5" aria-hidden /> {t.remove}
          </ActionButton>
        </div>
      </div>
    </FormSection>
  );
}

function ActionButton({
  children,
  disabled,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-portal-compact font-semibold transition hover:brightness-105 disabled:opacity-50"
      style={{
        borderColor: danger ? "var(--portal-danger)" : "var(--portal-line-strong)",
        color: danger ? "var(--portal-danger)" : "var(--portal-text)",
      }}
    >
      {children}
    </button>
  );
}

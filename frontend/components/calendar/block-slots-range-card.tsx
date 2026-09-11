"use client";

import { useState } from "react";
import { AdminCard } from "@/components/portal-atoms";
import { zonedInputToUtcInstant } from "@/lib/booking-pause-time";

/**
 * Block (or unblock) every open slot for a specific day, a continuous date
 * range, or a specific weekday repeated across a date range (e.g. "every
 * Thursday from 11 Sep to 11 Dec") — the calendar's replacement for the old
 * invisible "pause bookings" flag. This creates real BLOCKED slot rows
 * (materialising missing ones first), so the result shows up on the grid
 * immediately and is reversible per slot, same as blocking one slot by hand.
 * Shared by the doctor's own calendar and the admin calendar (scoped to
 * whichever doctor is selected there).
 */
export type BlockSlotsRangeLabels = {
  title: string;
  intro: string;
  modeDay: string;
  modeRange: string;
  wholeDay: string;
  day: string;
  from: string;
  until: string;
  fromTime: string;
  untilTime: string;
  weekdays: string;
  reason: string;
  reasonPlaceholder: string;
  block: string;
  blockBusy: string;
  unblock: string;
  unblockBusy: string;
  errorDates: string;
  errorEndAfterStart: string;
  errorNoWeekday: string;
  errorRangeTooLong: string;
};

const DEFAULT_LABELS: BlockSlotsRangeLabels = {
  title: "Block slots",
  intro:
    "Block every open slot on a specific day, a date range, or one weekday repeated across a range (e.g. every Thursday from 11 Sep to 11 Dec). Patients and the booking flow stop seeing them, and the calendar shows them blocked. Existing appointments are not cancelled.",
  modeDay: "Specific day",
  modeRange: "Date range",
  wholeDay: "Whole day",
  day: "Day",
  from: "From",
  until: "Until",
  fromTime: "From time",
  untilTime: "Until time",
  weekdays: "Repeat on",
  reason: "Reason",
  reasonPlaceholder: "Leave, training, clinic closed…",
  block: "Block slots",
  blockBusy: "Blocking…",
  unblock: "Unblock slots",
  unblockBusy: "Unblocking…",
  errorDates: "Pick at least a start date.",
  errorEndAfterStart: "End must be after start.",
  errorNoWeekday: "Pick at least one weekday.",
  errorRangeTooLong: "That range is too long — narrow it to under a year.",
};

// Sunday-first, matching Date#getUTCDay().
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ALL_WEEKDAYS = new Set([0, 1, 2, 3, 4, 5, 6]);
const MAX_SPANS = 366;

function ModeButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-sm font-semibold disabled:opacity-50"
      style={{
        borderColor: active ? "var(--color-brand-primary)" : "var(--color-border)",
        background: active ? "var(--color-brand-primary)" : "transparent",
        color: active ? "var(--color-brand-secondary)" : "var(--color-text-primary)",
      }}
    >
      {label}
    </button>
  );
}

function addDaysToDateInput(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Calendar weekday of a "YYYY-MM-DD" date, independent of any clock time. */
function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

export function BlockSlotsRangeCard({
  timeZone,
  disabled = false,
  disabledHint,
  busy,
  labels,
  onRun,
}: {
  timeZone: string;
  /** Admin surface: true when no doctor is selected — blocking is per-calendar. */
  disabled?: boolean;
  disabledHint?: string;
  busy: boolean;
  labels?: Partial<BlockSlotsRangeLabels>;
  onRun: (
    action: "BLOCK" | "UNBLOCK",
    spans: { fromUtc: string; toUtc: string }[],
    reason?: string,
  ) => void;
}) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const [mode, setMode] = useState<"day" | "range">("day");
  const [wholeDay, setWholeDay] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [untilDate, setUntilDate] = useState("");
  const [fromTime, setFromTime] = useState("09:00");
  const [untilTime, setUntilTime] = useState("17:00");
  // Every weekday selected == a plain continuous range (the common case);
  // narrowing this set is what turns it into "every Thursday, 11 Sep–11 Dec".
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set(ALL_WEEKDAYS));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function toggleWeekday(day: number) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function spanFor(dateFrom: string, dateTo: string): { fromUtc: string; toUtc: string } | null {
    if (wholeDay) {
      const fromUtc = zonedInputToUtcInstant(`${dateFrom}T00:00`, timeZone);
      const toUtc = zonedInputToUtcInstant(`${addDaysToDateInput(dateTo, 1)}T00:00`, timeZone);
      if (!fromUtc || !toUtc) return null;
      return { fromUtc, toUtc };
    }
    const fromUtc = zonedInputToUtcInstant(`${dateFrom}T${fromTime}`, timeZone);
    const toUtc = zonedInputToUtcInstant(`${dateTo}T${untilTime}`, timeZone);
    if (!fromUtc || !toUtc) return null;
    return { fromUtc, toUtc };
  }

  /** Returns an error string, or null with `spans` populated. */
  function computeSpans(): { spans: { fromUtc: string; toUtc: string }[] } | { error: string } {
    if (!fromDate) return { error: t.errorDates };

    if (mode === "day") {
      const span = spanFor(fromDate, fromDate);
      if (!span) return { error: t.errorDates };
      if (span.toUtc <= span.fromUtc) return { error: t.errorEndAfterStart };
      return { spans: [span] };
    }

    const endDate = untilDate || fromDate;
    if (endDate < fromDate) return { error: t.errorEndAfterStart };

    // Unfiltered range: one span covers every day, exactly as before —
    // cheaper than expanding a year into 365 identical-shaped spans.
    if (weekdays.size === ALL_WEEKDAYS.size) {
      const span = spanFor(fromDate, endDate);
      if (!span) return { error: t.errorDates };
      if (span.toUtc <= span.fromUtc) return { error: t.errorEndAfterStart };
      return { spans: [span] };
    }

    if (weekdays.size === 0) return { error: t.errorNoWeekday };

    const spans: { fromUtc: string; toUtc: string }[] = [];
    let cursor = fromDate;
    let guard = 0;
    while (cursor <= endDate) {
      guard += 1;
      if (guard > MAX_SPANS) return { error: t.errorRangeTooLong };
      if (weekdays.has(weekdayOf(cursor))) {
        const span = spanFor(cursor, cursor);
        if (!span) return { error: t.errorDates };
        spans.push(span);
      }
      cursor = addDaysToDateInput(cursor, 1);
    }
    if (spans.length === 0) return { error: t.errorNoWeekday };
    return { spans };
  }

  function submit(action: "BLOCK" | "UNBLOCK") {
    setError(null);
    const result = computeSpans();
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onRun(action, result.spans, action === "BLOCK" ? reason.trim() || undefined : undefined);
  }

  return (
    <AdminCard>
      <h3 className="m-0 text-base font-extrabold text-[var(--color-text-primary)]">{t.title}</h3>
      <p className="mb-4 mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{t.intro}</p>
      {disabled && disabledHint ? (
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">{disabledHint}</p>
      ) : null}
      <div role="radiogroup" className="mb-3 flex flex-wrap gap-1.5">
        <ModeButton
          active={mode === "day"}
          disabled={disabled}
          label={t.modeDay}
          onClick={() => setMode("day")}
        />
        <ModeButton
          active={mode === "range"}
          disabled={disabled}
          label={t.modeRange}
          onClick={() => setMode("range")}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">
          {mode === "day" ? t.day : t.from}
          <input
            className="gh-input"
            type="date"
            value={fromDate}
            disabled={disabled}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        {mode === "range" ? (
          <label className="grid gap-1 text-sm font-semibold">
            {t.until}
            <input
              className="gh-input"
              type="date"
              value={untilDate}
              disabled={disabled}
              onChange={(e) => setUntilDate(e.target.value)}
            />
          </label>
        ) : null}
        {mode === "range" ? (
          <div className="grid gap-1 text-sm font-semibold md:col-span-2">
            {t.weekdays}
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_SHORT.map((label, day) => (
                <ModeButton
                  key={day}
                  active={weekdays.has(day)}
                  disabled={disabled}
                  label={label}
                  onClick={() => toggleWeekday(day)}
                />
              ))}
            </div>
          </div>
        ) : null}
        {!wholeDay ? (
          <>
            <label className="grid gap-1 text-sm font-semibold">
              {t.fromTime}
              <input
                className="gh-input"
                type="time"
                value={fromTime}
                disabled={disabled}
                onChange={(e) => setFromTime(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              {t.untilTime}
              <input
                className="gh-input"
                type="time"
                value={untilTime}
                disabled={disabled}
                onChange={(e) => setUntilTime(e.target.value)}
              />
            </label>
          </>
        ) : null}
        <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2">
          <input
            type="checkbox"
            className="size-4"
            checked={wholeDay}
            disabled={disabled}
            onChange={(e) => setWholeDay(e.target.checked)}
          />
          {t.wholeDay}
        </label>
        <label className="grid gap-1 text-sm font-semibold md:col-span-2">
          {t.reason}
          <input
            className="gh-input"
            type="text"
            maxLength={200}
            placeholder={t.reasonPlaceholder}
            value={reason}
            disabled={disabled}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="gh-btn gh-btn-primary"
          disabled={disabled || busy}
          onClick={() => submit("BLOCK")}
        >
          {busy ? t.blockBusy : t.block}
        </button>
        <button
          type="button"
          className="gh-btn gh-btn-ghost"
          disabled={disabled || busy}
          onClick={() => submit("UNBLOCK")}
        >
          {busy ? t.unblockBusy : t.unblock}
        </button>
      </div>
    </AdminCard>
  );
}

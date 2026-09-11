"use client";

import { useState } from "react";
import { AdminCard } from "@/components/portal-atoms";
import { zonedInputToUtcInstant } from "@/lib/booking-pause-time";

/**
 * Block (or unblock) every open slot across a day or date range in one shot —
 * the calendar's replacement for the old invisible "pause bookings" flag.
 * This creates real BLOCKED slot rows (materialising missing ones first), so
 * the result shows up on the grid immediately and is reversible per slot,
 * same as blocking one slot by hand. Shared by the doctor's own calendar and
 * the admin calendar (scoped to whichever doctor is selected there).
 */
export type BlockSlotsRangeLabels = {
  title: string;
  intro: string;
  wholeDay: string;
  from: string;
  until: string;
  fromTime: string;
  untilTime: string;
  reason: string;
  reasonPlaceholder: string;
  block: string;
  blockBusy: string;
  unblock: string;
  unblockBusy: string;
  errorDates: string;
  errorEndAfterStart: string;
};

const DEFAULT_LABELS: BlockSlotsRangeLabels = {
  title: "Block slots",
  intro:
    "Block every open slot on a day or date range — patients and the booking flow stop seeing them, and the calendar shows them blocked. Existing appointments are not cancelled.",
  wholeDay: "Whole day(s)",
  from: "From",
  until: "Until (optional)",
  fromTime: "From time",
  untilTime: "Until time",
  reason: "Reason",
  reasonPlaceholder: "Leave, training, clinic closed…",
  block: "Block slots",
  blockBusy: "Blocking…",
  unblock: "Unblock slots",
  unblockBusy: "Unblocking…",
  errorDates: "Pick at least a start date.",
  errorEndAfterStart: "End must be after start.",
};

function addDaysToDateInput(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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
    span: { fromUtc: string; toUtc: string },
    reason?: string,
  ) => void;
}) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const [wholeDay, setWholeDay] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [untilDate, setUntilDate] = useState("");
  const [fromTime, setFromTime] = useState("09:00");
  const [untilTime, setUntilTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function computeSpan(): { fromUtc: string; toUtc: string } | null {
    if (!fromDate) return null;
    if (wholeDay) {
      const endDate = addDaysToDateInput(untilDate || fromDate, 1);
      const fromUtc = zonedInputToUtcInstant(`${fromDate}T00:00`, timeZone);
      const toUtc = zonedInputToUtcInstant(`${endDate}T00:00`, timeZone);
      if (!fromUtc || !toUtc) return null;
      return { fromUtc, toUtc };
    }
    const endDate = untilDate || fromDate;
    const fromUtc = zonedInputToUtcInstant(`${fromDate}T${fromTime}`, timeZone);
    const toUtc = zonedInputToUtcInstant(`${endDate}T${untilTime}`, timeZone);
    if (!fromUtc || !toUtc) return null;
    return { fromUtc, toUtc };
  }

  function submit(action: "BLOCK" | "UNBLOCK") {
    setError(null);
    const span = computeSpan();
    if (!span) {
      setError(t.errorDates);
      return;
    }
    if (span.toUtc <= span.fromUtc) {
      setError(t.errorEndAfterStart);
      return;
    }
    onRun(action, span, action === "BLOCK" ? reason.trim() || undefined : undefined);
  }

  return (
    <AdminCard>
      <h3 className="m-0 text-base font-extrabold text-[var(--color-text-primary)]">{t.title}</h3>
      <p className="mb-4 mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{t.intro}</p>
      {disabled && disabledHint ? (
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">{disabledHint}</p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">
          {t.from}
          <input
            className="gh-input"
            type="date"
            value={fromDate}
            disabled={disabled}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
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

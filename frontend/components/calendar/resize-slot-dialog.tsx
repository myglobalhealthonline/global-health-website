"use client";

import { useState } from "react";
import { PortalDialog } from "@/components/PortalDialog";
import { BASE_SLOT_MINUTES } from "@/lib/constants";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import type { CalendarItem } from "./calendar-types";

/** Lengths a slot can be resized to, on the base grid. */
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

/** Current length in minutes, or the base grid when the item has no end. */
function currentMinutes(slot: CalendarItem): number {
  if (!slot.endAt) return BASE_SLOT_MINUTES;
  const mins = Math.round(
    (new Date(slot.endAt).getTime() - new Date(slot.startAt).getTime()) / 60000,
  );
  return mins > 0 ? mins : BASE_SLOT_MINUTES;
}

export type ResizeSlotLabels = {
  title: string;
  intro: string;
  lengthLabel: string;
  currentSuffix: string;
  growthHint: string;
  cancel: string;
  confirm: string;
  confirmBusy: string;
};

const DEFAULT_LABELS: ResizeSlotLabels = {
  title: "Change slot length",
  intro:
    "The slot keeps its start time. Making it longer takes over the free slots that follow; making it shorter hands that time back as new slots.",
  lengthLabel: "Length",
  currentSuffix: "current",
  growthHint:
    "A booked or held slot in the way will stop the change — cancel that booking first.",
  cancel: "Cancel",
  confirm: "Save length",
  confirmBusy: "Saving…",
};

/**
 * Resize an OPEN/BLOCKED slot on the base grid. Shared by the admin calendar,
 * the per-doctor availability grid, and the doctor's own calendar — the doctor
 * portal passes localized `labels`; admin takes the English defaults.
 */
export function ResizeSlotDialog({
  open,
  slot,
  tz,
  busy = false,
  error,
  labels,
  onClose,
  onConfirm,
}: {
  open: boolean;
  slot: CalendarItem | null;
  tz: string;
  busy?: boolean;
  error?: string | null;
  labels?: Partial<ResizeSlotLabels>;
  onClose: () => void;
  onConfirm: (durationMinutes: number) => void;
}) {
  const initial = slot ? currentMinutes(slot) : BASE_SLOT_MINUTES;
  const [duration, setDuration] = useState(initial);

  if (!slot) return null;

  const t = { ...DEFAULT_LABELS, ...labels };
  // A slot that was resized to an off-list length (or generated from a window
  // with a different grid) still needs its own value in the list, or the select
  // would silently show something the slot isn't.
  const options = DURATION_OPTIONS.includes(initial)
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, initial].sort((a, b) => a - b);

  return (
    <PortalDialog open={open} onClose={onClose} title={t.title}>
      <div className="grid gap-4">
        <div
          className="rounded-[var(--radius-card-sm)] border px-3 py-2.5 text-sm"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-background-subtle, transparent)",
          }}
        >
          <span className="font-semibold text-[var(--color-text-primary)]">
            {formatAppDate(slot.startAt, tz)} · {formatAppTime(slot.startAt, tz)}
            {slot.endAt ? ` – ${formatAppTime(slot.endAt, tz)}` : ""}
          </span>
          {slot.meta?.doctorName ? (
            <span className="ml-1 text-portal-meta text-[var(--color-text-muted)]">
              · {slot.meta.doctorName}
            </span>
          ) : null}
        </div>

        <p className="text-portal-compact text-[var(--color-text-body)]">{t.intro}</p>

        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">{t.lengthLabel}</span>
          <select
            className="gh-select"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {options.map((d) => (
              <option key={d} value={d}>
                {d} min{d === initial ? ` (${t.currentSuffix})` : ""}
              </option>
            ))}
          </select>
          <span className="text-portal-meta text-[var(--color-text-muted)]">
            {t.growthHint}
          </span>
        </label>

        {error ? (
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
            {error}
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
            onClick={() => onConfirm(duration)}
            className="gh-btn gh-btn-primary"
            disabled={busy || duration === initial}
          >
            {busy ? t.confirmBusy : t.confirm}
          </button>
        </div>
      </div>
    </PortalDialog>
  );
}

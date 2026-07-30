"use client";

import { useState } from "react";
import { PortalDialog } from "@/components/PortalDialog";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import type { CalendarItem } from "./calendar-types";

/**
 * Admin remove-a-slot confirmation. Unlike blocking, this deletes the slot row
 * and records a single-date availability exception, so the recurring weekly
 * window can't regenerate it — there is no undo in the UI. Hence a confirm step
 * that spells out the scope: this date only, the weekly window is untouched.
 */
export type RemoveSlotLabels = {
  title: string;
  blockedSuffix: string;
  intro: string;
  warning: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  reasonHint: string;
  cancel: string;
  confirm: string;
  confirmBusy: string;
};

const DEFAULT_LABELS: RemoveSlotLabels = {
  title: "Remove this slot",
  blockedSuffix: "currently blocked",
  intro:
    "The slot is deleted from this date only — the recurring weekly window is not changed, so the same weekday next week still generates slots as usual.",
  warning:
    "This can't be undone from the calendar. To keep the slot but take it out of bookable inventory, block it instead.",
  reasonLabel: "Reason",
  reasonPlaceholder: "Created in error, clinic closed…",
  reasonHint: "Optional — kept on the removal record.",
  cancel: "Cancel",
  confirm: "Remove slot",
  confirmBusy: "Removing…",
};

export function RemoveSlotDialog({
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
  /** Timezone the slot time is shown in — matches the grid the click came from. */
  tz: string;
  busy?: boolean;
  error?: string | null;
  /** Doctor portal passes localized copy; admin takes the English defaults. */
  labels?: Partial<RemoveSlotLabels>;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  if (!slot) return null;

  const t = { ...DEFAULT_LABELS, ...labels };
  const isBlocked = slot.status === "BLOCKED";

  return (
    <PortalDialog open={open} onClose={onClose} title={t.title} danger>
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
          </span>
          {slot.meta?.doctorName ? (
            <span className="ml-1 text-portal-meta text-[var(--color-text-muted)]">
              · {slot.meta.doctorName}
            </span>
          ) : null}
          {isBlocked ? (
            <span className="ml-1 text-portal-meta text-[var(--color-text-muted)]">
              · {t.blockedSuffix}
            </span>
          ) : null}
        </div>

        <p className="text-portal-compact text-[var(--color-text-body)]">{t.intro}</p>
        <p className="text-portal-compact font-semibold text-[var(--color-text-primary)]">
          {t.warning}
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">{t.reasonLabel}</span>
          <input
            type="text"
            className="gh-input"
            maxLength={200}
            placeholder={t.reasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <span className="text-portal-meta text-[var(--color-text-muted)]">
            {t.reasonHint}
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
            onClick={() => onConfirm(reason.trim())}
            className="gh-btn gh-btn-danger"
            disabled={busy}
          >
            {busy ? t.confirmBusy : t.confirm}
          </button>
        </div>
      </div>
    </PortalDialog>
  );
}

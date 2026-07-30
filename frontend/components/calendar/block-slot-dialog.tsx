"use client";

import { useState } from "react";
import { PortalDialog } from "@/components/PortalDialog";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import type { CalendarItem } from "./calendar-types";

/**
 * Admin block-a-slot confirmation. Blocking is reversible (the same slot can be
 * re-opened with one click), so this dialog exists for the optional reason —
 * which is what the calendar shows on hover afterwards — not as a safety gate.
 * Shared by the admin calendar and the per-doctor availability week grid.
 */
export function BlockSlotDialog({
  open,
  slot,
  tz,
  busy = false,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  slot: CalendarItem | null;
  /** Timezone the slot time is shown in — matches the grid the click came from. */
  tz: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  if (!slot) return null;

  return (
    <PortalDialog open={open} onClose={onClose} title="Block this time" danger>
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
        </div>

        <p className="text-portal-compact text-[var(--color-text-body)]">
          The slot leaves bookable inventory — patients and the booking flow stop
          seeing it. Click the red block again to re-open it.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Reason</span>
          <input
            type="text"
            className="gh-input"
            maxLength={200}
            placeholder="Admin hold, training, clinic closed…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <span className="text-portal-meta text-[var(--color-text-muted)]">
            Optional — shown on hover in the calendar. Defaults to “Blocked by
            admin”.
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
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            className="gh-btn gh-btn-primary"
            disabled={busy}
          >
            {busy ? "Blocking…" : "Block slot"}
          </button>
        </div>
      </div>
    </PortalDialog>
  );
}

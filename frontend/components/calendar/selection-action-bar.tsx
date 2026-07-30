"use client";

import { useState } from "react";
import { Ban, Trash2, Unlock, X } from "lucide-react";
import type { BulkSlotAction } from "@/lib/api/slot-bulk-types";

export type SelectionBarLabels = {
  count: string;
  block: string;
  unblock: string;
  remove: string;
  /** Armed state of Remove — "{count}" interpolated. */
  removeConfirm: string;
  clear: string;
  hint: string;
};

const DEFAULT_LABELS: SelectionBarLabels = {
  count: "{count} slots selected",
  block: "Block",
  unblock: "Re-open",
  remove: "Remove",
  removeConfirm: "Delete {count} for good?",
  clear: "Clear",
  hint: "Booked slots are never changed.",
};

/**
 * Floating bar for the calendar's multi-select. Appears only while something is
 * selected, so the grid is not permanently wearing a toolbar it rarely needs.
 * Sits above the grid but below dialogs, and out of the way of the sticky day
 * header the grid scrolls under.
 *
 * Remove arms before it fires. Block and Remove are adjacent pills of the same
 * size, but they are not the same kind of action: Block flips a status the
 * doctor can flip back, while Remove deletes the slots AND writes an exception
 * per span so the recurring window can never re-generate them. A single stray
 * click used to wipe a whole selected week permanently, with no confirm and no
 * undo — and it read afterwards as slots that had "disappeared on their own",
 * because nothing in the UI shows an exception. The other two removal paths
 * (per-slot bin, one-off group) already confirm; this one is the dangerous one,
 * since the selection can span the entire week.
 */
export function SelectionActionBar({
  count,
  busy = false,
  labels,
  onAction,
  onClear,
}: {
  count: number;
  busy?: boolean;
  labels?: Partial<SelectionBarLabels>;
  onAction: (action: BulkSlotAction) => void;
  onClear: () => void;
}) {
  const [armed, setArmed] = useState(false);
  // Disarm whenever the selection itself changes, so a confirming click can
  // never land on a different set of slots than the one it was armed for.
  // Render-time adjustment rather than an effect: an effect would leave the
  // button armed for one frame against the new selection.
  const [armedFor, setArmedFor] = useState(count);
  if (armedFor !== count) {
    setArmedFor(count);
    if (armed) setArmed(false);
  }

  if (count === 0) return null;
  const t = { ...DEFAULT_LABELS, ...labels };

  return (
    <div
      className="gh-selection-bar sticky bottom-3 z-[var(--z-sticky,20)] mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-[999px] px-3 py-2 shadow-lg"
      style={{
        border: "1px solid var(--portal-line-strong)",
        background: "var(--portal-surface)",
      }}
      role="status"
    >
      <span className="px-1 text-portal-compact font-bold text-[var(--portal-text)]">
        {t.count.split("{count}").join(String(count))}
      </span>
      <span className="hidden text-portal-meta text-[var(--portal-muted)] sm:inline">
        {t.hint}
      </span>
      <BarButton disabled={busy} onClick={() => onAction("BLOCK")}>
        <Ban className="size-3.5" aria-hidden /> {t.block}
      </BarButton>
      <BarButton disabled={busy} onClick={() => onAction("UNBLOCK")}>
        <Unlock className="size-3.5" aria-hidden /> {t.unblock}
      </BarButton>
      <BarButton
        disabled={busy}
        danger
        filled={armed}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          setArmed(false);
          onAction("REMOVE");
        }}
      >
        <Trash2 className="size-3.5" aria-hidden />{" "}
        {armed ? t.removeConfirm.split("{count}").join(String(count)) : t.remove}
      </BarButton>
      <BarButton
        disabled={busy}
        onClick={() => {
          setArmed(false);
          onClear();
        }}
      >
        <X className="size-3.5" aria-hidden /> {t.clear}
      </BarButton>
    </div>
  );
}

function BarButton({
  children,
  disabled,
  danger = false,
  filled = false,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  filled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-[999px] border px-2.5 py-1 text-portal-compact font-semibold transition hover:brightness-105 disabled:opacity-50"
      style={{
        borderColor: danger ? "var(--portal-danger)" : "var(--portal-line-strong)",
        // Armed destructive action inverts: the second click has to look like a
        // different button than the first one, not a repeat of it.
        background: filled ? "var(--portal-danger)" : undefined,
        color: filled
          ? "#fff"
          : danger
            ? "var(--portal-danger)"
            : "var(--portal-text)",
      }}
    >
      {children}
    </button>
  );
}

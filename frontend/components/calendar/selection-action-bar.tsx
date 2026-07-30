"use client";

import { Ban, Trash2, Unlock, X } from "lucide-react";
import type { BulkSlotAction } from "@/lib/api/slot-bulk-types";

export type SelectionBarLabels = {
  count: string;
  block: string;
  unblock: string;
  remove: string;
  clear: string;
  hint: string;
};

const DEFAULT_LABELS: SelectionBarLabels = {
  count: "{count} slots selected",
  block: "Block",
  unblock: "Re-open",
  remove: "Remove",
  clear: "Clear",
  hint: "Booked slots are never changed.",
};

/**
 * Floating bar for the calendar's multi-select. Appears only while something is
 * selected, so the grid is not permanently wearing a toolbar it rarely needs.
 * Sits above the grid but below dialogs, and out of the way of the sticky day
 * header the grid scrolls under.
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
      <BarButton disabled={busy} danger onClick={() => onAction("REMOVE")}>
        <Trash2 className="size-3.5" aria-hidden /> {t.remove}
      </BarButton>
      <BarButton disabled={busy} onClick={onClear}>
        <X className="size-3.5" aria-hidden /> {t.clear}
      </BarButton>
    </div>
  );
}

function BarButton({
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
      className="inline-flex items-center gap-1 rounded-[999px] border px-2.5 py-1 text-portal-compact font-semibold transition hover:brightness-105 disabled:opacity-50"
      style={{
        borderColor: danger ? "var(--portal-danger)" : "var(--portal-line-strong)",
        color: danger ? "var(--portal-danger)" : "var(--portal-text)",
      }}
    >
      {children}
    </button>
  );
}

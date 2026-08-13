import type { BulkSlotAction, BulkSlotResult } from "@/lib/api/slot-bulk-types";

/**
 * Plain-English summary of a completed bulk action. Skips are the normal case,
 * not an error — a sweep across working days routinely covers booked time — so
 * they belong in the success line rather than being swallowed.
 *
 * `{count}` is substituted; the doctor portal passes localized templates and
 * admin takes these defaults.
 */
export type BulkResultLabels = {
  blocked: string;
  unblocked: string;
  removed: string;
  skippedOccupied: string;
  skippedMissing: string;
  nothingToDo: string;
};

export const DEFAULT_BULK_RESULT_LABELS: BulkResultLabels = {
  blocked: "Blocked {count} slots.",
  unblocked: "Re-opened {count} slots.",
  removed: "Removed {count} slots.",
  skippedOccupied: "{count} skipped — booked or on hold.",
  skippedMissing: "{count} skipped — no longer on the calendar.",
  nothingToDo: "Nothing to change — those slots were already in that state.",
};

function fill(template: string, count: number): string {
  return template.split("{count}").join(String(count));
}

export function describeBulkResult(
  action: BulkSlotAction,
  result: BulkSlotResult,
  labels?: Partial<BulkResultLabels>,
): string {
  const t = { ...DEFAULT_BULK_RESULT_LABELS, ...labels };
  if (result.changed === 0 && result.skippedOccupied === 0 && result.skippedMissing === 0) {
    return t.nothingToDo;
  }
  const head =
    action === "BLOCK" ? t.blocked : action === "UNBLOCK" ? t.unblocked : t.removed;
  const parts = [fill(head, result.changed)];
  if (result.skippedOccupied > 0) {
    parts.push(fill(t.skippedOccupied, result.skippedOccupied));
  }
  if (result.skippedMissing > 0) {
    parts.push(fill(t.skippedMissing, result.skippedMissing));
  }
  return parts.join(" ");
}

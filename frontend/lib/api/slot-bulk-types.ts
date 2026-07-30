/**
 * Shared shapes for the bulk slot endpoints. The doctor-scoped and
 * admin-scoped clients post the same body to the same handler behind different
 * guards, so the contract lives in one place rather than being retyped twice.
 */

export type BulkSlotAction = "BLOCK" | "UNBLOCK" | "REMOVE";

/** Half-open UTC interval. A date range crossed with a daily time range becomes
 *  one span PER DAY — a single long span would also swallow the nights. */
export type BulkSlotSpan = { fromUtc: string; toUtc: string };

/** Exactly one of `spans` / `slotIds`: the Manage panel sends spans, the
 *  calendar's multi-select sends ids. */
export type BulkSlotInput = {
  action: BulkSlotAction;
  spans?: BulkSlotSpan[];
  slotIds?: string[];
  reason?: string;
};

export type BulkSlotResult = {
  /** Slots actually blocked, unblocked, or removed. */
  changed: number;
  /** Left alone because they are BOOKED or HELD. */
  skippedOccupied: number;
  /** Ids that matched no slot of this doctor. */
  skippedMissing: number;
};

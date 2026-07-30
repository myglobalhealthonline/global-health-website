"use client";

import { useCallback, useState } from "react";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import type {
  BulkSlotAction,
  BulkSlotInput,
  BulkSlotResult,
} from "@/lib/api/slot-bulk-types";

/**
 * One state machine for every slot mutation, shared by the doctor calendar and
 * both admin surfaces.
 *
 * Each of those three used to carry its own copy of the same block: a `busy`
 * flag, an error string, a notice string, three dialog targets, and four
 * near-identical async wrappers that call a client function and then refresh.
 * The only real differences were which client to call (doctor-scoped vs
 * admin-scoped-by-doctorId) and how to refresh (`router.refresh()` on a
 * server-rendered page vs a client refetch). Those two are the adapter; the
 * rest lives here.
 */

type SlotResult<T> = { ok: true; data: T; message?: string } | { ok: false; message: string };

/** What a surface must supply: how to reach the API, and how to reload after. */
export type SlotManagerAdapter = {
  setStatus(
    slotId: string,
    status: "OPEN" | "BLOCKED",
    reason?: string,
  ): Promise<SlotResult<unknown>>;
  remove(slotId: string, reason?: string): Promise<SlotResult<unknown>>;
  create(
    startAtIsos: string[],
    durationMinutes: number,
  ): Promise<SlotResult<{ created: number; skippedOverlap: number; skippedPast: number }>>;
  bulk(input: BulkSlotInput): Promise<SlotResult<BulkSlotResult>>;
  /** Re-read the calendar. `router.refresh()`, or a client-side refetch. */
  onChanged(): void | Promise<void>;
  /** Describe a completed add for the notice line (locale-aware per surface). */
  describeAdd(result: { created: number; skippedOverlap: number; skippedPast: number }): string;
  /** Describe a completed bulk action for the notice line. */
  describeBulk(action: BulkSlotAction, result: BulkSlotResult): string;
};

/**
 * Calendar item ids are namespaced on the admin surfaces (`s-<slotId>`) so a
 * slot and a consultation can't collide; the doctor portal uses bare ids. The
 * API always wants the bare one.
 */
export function bareSlotId(item: CalendarItem | string): string {
  const id = typeof item === "string" ? item : item.id;
  return id.replace(/^s-/, "");
}

export function useSlotManager(adapter: SlotManagerAdapter) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Dialog targets. Null means closed; the surfaces key their dialogs on the
  // target id so each one remounts with fresh field state.
  const [blockTarget, setBlockTarget] = useState<CalendarItem | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CalendarItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Multi-select. Holds BARE slot ids so the set can be posted as-is. Always
  // available — every slot carries its own checkbox, so there is no mode.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const clearMessages = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  /** Run a mutation, surface its failure, refresh on success. Returns whether
   *  it succeeded so callers can decide about closing their dialog. */
  const run = useCallback(
    async <T,>(
      call: () => Promise<SlotResult<T>>,
      onSuccess?: (data: T) => void,
    ): Promise<boolean> => {
      setError(null);
      setBusy(true);
      const res = await call();
      setBusy(false);
      if (!res.ok) {
        setError(res.message);
        return false;
      }
      onSuccess?.(res.data);
      await adapter.onChanged();
      return true;
    },
    [adapter],
  );

  const setStatus = useCallback(
    async (item: CalendarItem, status: "OPEN" | "BLOCKED", reason?: string) => {
      const ok = await run(() => adapter.setStatus(bareSlotId(item), status, reason));
      if (ok) setBlockTarget(null);
    },
    [adapter, run],
  );

  const remove = useCallback(
    async (item: CalendarItem, reason?: string) => {
      const ok = await run(() => adapter.remove(bareSlotId(item), reason));
      if (ok) setRemoveTarget(null);
    },
    [adapter, run],
  );

  const create = useCallback(
    async (startAtIsos: string[], durationMinutes: number) => {
      const ok = await run(
        () => adapter.create(startAtIsos, durationMinutes),
        (data) => setNotice(adapter.describeAdd(data)),
      );
      if (ok) setAddOpen(false);
    },
    [adapter, run],
  );

  /** Bulk over a date × time sweep. Spans are pre-expanded by the caller. */
  const bulkBySpans = useCallback(
    async (
      action: BulkSlotAction,
      spans: { fromUtc: string; toUtc: string }[],
      reason?: string,
    ) =>
      run(
        () => adapter.bulk({ action, spans, reason }),
        (data) => setNotice(adapter.describeBulk(action, data)),
      ),
    [adapter, run],
  );

  /** Bulk over an explicit id list — used by the sidebar's per-date groups,
   *  which already know exactly which slots they cover. */
  const bulkIds = useCallback(
    async (action: BulkSlotAction, slotIds: string[], reason?: string) => {
      if (slotIds.length === 0) return false;
      return run(
        () => adapter.bulk({ action, slotIds, reason }),
        (data) => setNotice(adapter.describeBulk(action, data)),
      );
    },
    [adapter, run],
  );

  /** Bulk over the current selection; clears it on success. */
  const bulkSelected = useCallback(
    async (action: BulkSlotAction, reason?: string) => {
      const slotIds = [...selected];
      if (slotIds.length === 0) return false;
      const ok = await run(
        () => adapter.bulk({ action, slotIds, reason }),
        (data) => setNotice(adapter.describeBulk(action, data)),
      );
      if (ok) setSelected(new Set());
      return ok;
    },
    [adapter, run, selected],
  );

  const toggleSelected = useCallback((item: CalendarItem) => {
    const id = bareSlotId(item);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  return {
    busy,
    error,
    notice,
    setError,
    setNotice,
    clearMessages,

    blockTarget,
    setBlockTarget,
    removeTarget,
    setRemoveTarget,
    addOpen,
    setAddOpen,

    selected,
    toggleSelected,
    clearSelection,

    setStatus,
    remove,
    create,
    bulkBySpans,
    bulkIds,
    bulkSelected,
  };
}

export type SlotManager = ReturnType<typeof useSlotManager>;

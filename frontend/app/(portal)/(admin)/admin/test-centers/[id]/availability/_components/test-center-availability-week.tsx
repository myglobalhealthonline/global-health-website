"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { TimezoneSelect } from "@/components/calendar/TimezoneSelect";
import {
  addWeeksKey,
  groupItemsByLocalDay,
  todayKey,
  weekDaysOf,
} from "@/components/calendar/calendar-utils";
import {
  AddSlotDialog,
  describeAddResult,
} from "@/components/calendar/add-slot-dialog";
import { BlockSlotDialog } from "@/components/calendar/block-slot-dialog";
import { RemoveSlotDialog } from "@/components/calendar/remove-slot-dialog";
import { SelectionActionBar } from "@/components/calendar/selection-action-bar";
import { describeBulkResult } from "@/lib/calendar/bulk-result-copy";
import { useSlotManager } from "@/lib/calendar/use-slot-manager";
import { CURATED_TIME_ZONES } from "@/lib/timezones";
import {
  adminBulkSlotAction,
  adminCreateSlots,
  adminRemoveSlot,
  adminToggleSlotStatus,
} from "@/lib/api/admin-slot-client";
import { BookTestSlotDialog, type ExamOption } from "./book-test-slot-dialog";

type Props = {
  testCenterId: string;
  testCenterName: string;
  countryCode: string;
  /** The center's country timezone — its windows are authored in this. */
  centerTz: string;
  /** Any calendar date inside the visible week ("YYYY-MM-DD"). */
  weekAnchor: string;
  items: CalendarItem[];
  /** Active exams this centre offers, priced. Empty disables booking. */
  exams: ExamOption[];
  defaultDialCode: string;
  bookAction: (formData: FormData) => void | Promise<void>;
};

/**
 * Week grid for one test center's bookable inventory.
 *
 * Reuses the doctor calendar stack wholesale — `WeekCalendar`, `useSlotManager`
 * and the four dialogs are already owner-agnostic; the only center-specific
 * part is the adapter, which now addresses the API by owner rather than by
 * doctor id.
 *
 * Clicking an OPEN slot toggles it blocked (and a BLOCKED one back open),
 * matching how the doctor portal behaves for its own calendar. The admin
 * booking dialog the doctor surface opens on click has no test equivalent yet —
 * manual test booking is a later phase — so wiring the click to a booking flow
 * that does not exist would be dead UI.
 */
export function TestCenterAvailabilityWeek({
  testCenterId,
  testCenterName,
  countryCode,
  centerTz,
  weekAnchor,
  items,
  exams,
  defaultDialCode,
  bookAction,
}: Props) {
  const [selectedSlot, setSelectedSlot] = useState<CalendarItem | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  // Default to center time — the windows are authored in it, so the grid lines
  // up with the "From/To (center time)" table on the page.
  const [tz, setTz] = useState<string>(centerTz);

  const owner = { kind: "test-centers", id: testCenterId } as const;
  const slotManager = useSlotManager({
    setStatus: (slotId, status, reason) =>
      adminToggleSlotStatus(owner, slotId, status, reason),
    remove: (slotId, reason) => adminRemoveSlot(owner, slotId, reason),
    create: (startAtIsos, durationMinutes) =>
      adminCreateSlots(owner, startAtIsos, durationMinutes),
    bulk: (input) => adminBulkSlotAction(owner, input),
    onChanged: () => router.refresh(),
    describeAdd: (result) => describeAddResult(result),
    describeBulk: (action, result) => describeBulkResult(action, result),
  });

  const tzOptions = useMemo(() => {
    const set = new Set<string>([centerTz, ...CURATED_TIME_ZONES]);
    return [...set];
  }, [centerTz]);

  const weekDays = useMemo(() => weekDaysOf(weekAnchor), [weekAnchor]);
  const itemsByDay = useMemo(() => groupItemsByLocalDay(items, tz), [items, tz]);

  function goToWeek(anchor: string) {
    const params = new URLSearchParams();
    params.set("wk", anchor);
    router.push(`${pathname}?${params.toString()}`);
    // Next caches the RSC payload per URL on the client, so navigating to a
    // week visited before a mutation would replay the stale one.
    router.refresh();
  }

  const busy = slotManager.busy;

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="gh-btn gh-btn-outline"
            onClick={() => {
              slotManager.clearMessages();
              slotManager.setAddOpen(true);
            }}
          >
            <Plus className="size-3.5" aria-hidden /> Add slots
          </button>
          <TimezoneSelect value={tz} options={tzOptions} onChange={setTz} />
        </div>
      </div>

      {/* The dialogs render their own copy of the error — don't say it twice. */}
      {slotManager.error &&
      !slotManager.blockTarget &&
      !slotManager.removeTarget &&
      !slotManager.addOpen ? (
        <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
          {slotManager.error}
        </p>
      ) : null}
      {slotManager.notice ? (
        <p className="gh-status-success rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
          {slotManager.notice}
        </p>
      ) : null}

      <div className="min-w-0">
        <WeekCalendar
          anchorDayKey={weekAnchor}
          weekDays={weekDays}
          itemsByDay={itemsByDay}
          tz={tz}
          todayKey={todayKey(tz)}
          // Clicking an open slot books it, matching the doctor grid. Blocking
          // and removing stay on the corner buttons, so booking never costs the
          // admin an extra step.
          onSelectOpenSlot={setSelectedSlot}
          onSelectConsultation={() => {}}
          onBlockSlot={(item) => {
            slotManager.setError(null);
            slotManager.setBlockTarget(item);
          }}
          onSelectBlockedSlot={(item) => void slotManager.setStatus(item, "OPEN")}
          onRemoveSlot={(item) => {
            slotManager.setError(null);
            slotManager.setRemoveTarget(item);
          }}
          selectedIds={slotManager.selected}
          onToggleSelect={slotManager.toggleSelected}
          slotActionsBusy={busy}
          onPrevWeek={() => goToWeek(addWeeksKey(weekAnchor, -1))}
          onNextWeek={() => goToWeek(addWeeksKey(weekAnchor, 1))}
          onToday={() => goToWeek(todayKey(tz))}
        />
      </div>

      <BookTestSlotDialog
        key={selectedSlot?.id ?? "none"}
        open={selectedSlot !== null}
        onClose={() => setSelectedSlot(null)}
        slot={selectedSlot}
        testCenterId={testCenterId}
        testCenterName={testCenterName}
        countryCode={countryCode}
        centerTz={centerTz}
        exams={exams}
        defaultDialCode={defaultDialCode}
        action={bookAction}
      />

      <SelectionActionBar
        count={slotManager.selected.size}
        busy={busy}
        onAction={(action) => void slotManager.bulkSelected(action)}
        onClear={slotManager.clearSelection}
      />

      <BlockSlotDialog
        key={slotManager.blockTarget?.id ?? "no-block"}
        open={slotManager.blockTarget !== null}
        slot={slotManager.blockTarget}
        tz={tz}
        busy={busy}
        error={slotManager.error}
        onClose={() => {
          slotManager.setBlockTarget(null);
          slotManager.setError(null);
        }}
        onConfirm={(reason) => {
          const target = slotManager.blockTarget;
          if (target) void slotManager.setStatus(target, "BLOCKED", reason || undefined);
        }}
      />

      <AddSlotDialog
        key={slotManager.addOpen ? `add-${weekAnchor}` : "no-add"}
        open={slotManager.addOpen}
        doctorName={testCenterName}
        tz={tz}
        defaultDate={weekAnchor}
        busy={busy}
        error={slotManager.error}
        onClose={() => {
          slotManager.setAddOpen(false);
          slotManager.setError(null);
        }}
        onConfirm={(startAtIsos, durationMinutes) =>
          void slotManager.create(startAtIsos, durationMinutes)
        }
      />

      <RemoveSlotDialog
        key={slotManager.removeTarget?.id ?? "no-remove"}
        open={slotManager.removeTarget !== null}
        slot={slotManager.removeTarget}
        tz={tz}
        busy={busy}
        error={slotManager.error}
        onClose={() => {
          slotManager.setRemoveTarget(null);
          slotManager.setError(null);
        }}
        onConfirm={(reason) => {
          const target = slotManager.removeTarget;
          if (target) void slotManager.remove(target, reason || undefined);
        }}
      />
    </div>
  );
}

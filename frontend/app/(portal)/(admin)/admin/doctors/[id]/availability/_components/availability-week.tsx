"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckSquare, Plus } from "lucide-react";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
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
import { ResizeSlotDialog } from "@/components/calendar/resize-slot-dialog";
import { SelectionActionBar } from "@/components/calendar/selection-action-bar";
import { SlotManagerPanel } from "@/components/calendar/slot-manager-panel";
import { describeBulkResult } from "@/lib/calendar/bulk-result-copy";
import { useSlotManager } from "@/lib/calendar/use-slot-manager";
import { CURATED_TIME_ZONES } from "@/lib/timezones";
import {
  adminBulkSlotAction,
  adminCreateSlots,
  adminRemoveSlot,
  adminResizeSlot,
  adminToggleSlotStatus,
} from "@/lib/api/admin-slot-client";
import {
  BookSlotDialog,
  type ClinicOption,
  type ServiceOption,
} from "./book-slot-dialog";

type Props = {
  doctorId: string;
  doctorName: string;
  countryCode: string;
  clinicTz: string;
  /** Any calendar date inside the visible week ("YYYY-MM-DD"). */
  weekAnchor: string;
  items: CalendarItem[];
  services: ServiceOption[];
  clinics: ClinicOption[];
  defaultDialCode: string;
  bookAction: (formData: FormData) => void | Promise<void>;
};

export function AvailabilityWeek({
  doctorId,
  doctorName,
  countryCode,
  clinicTz,
  weekAnchor,
  items,
  services,
  clinics,
  defaultDialCode,
  bookAction,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  // Default to clinic time — the availability windows are authored in it, so
  // the grid lines up with the "From/To (clinic time)" table below.
  const [tz, setTz] = useState<string>(clinicTz);
  const [selectedSlot, setSelectedSlot] = useState<CalendarItem | null>(null);
  const [activeConsult, setActiveConsult] = useState<CalendarItem | null>(null);

  // Every slot mutation runs through the shared manager; the adapter is the
  // only admin-specific part (doctor-scoped endpoints + a server refresh).
  const slotManager = useSlotManager({
    setStatus: (slotId, status, reason) =>
      adminToggleSlotStatus(doctorId, slotId, status, reason),
    resize: (slotId, durationMinutes) =>
      adminResizeSlot(doctorId, slotId, durationMinutes),
    remove: (slotId, reason) => adminRemoveSlot(doctorId, slotId, reason),
    create: (startAtIsos, durationMinutes) =>
      adminCreateSlots(doctorId, startAtIsos, durationMinutes),
    bulk: (input) => adminBulkSlotAction(doctorId, input),
    onChanged: () => router.refresh(),
    describeAdd: (result) => describeAddResult(result),
    describeBulk: (action, result) => describeBulkResult(action, result),
  });

  const tzOptions = useMemo(() => {
    const set = new Set<string>([clinicTz, ...CURATED_TIME_ZONES]);
    return [...set];
  }, [clinicTz]);

  const weekDays = useMemo(() => weekDaysOf(weekAnchor), [weekAnchor]);
  const itemsByDay = useMemo(() => groupItemsByLocalDay(items, tz), [items, tz]);

  function goToWeek(anchor: string) {
    const params = new URLSearchParams();
    params.set("wk", anchor);
    router.push(`${pathname}?${params.toString()}`);
  }

  const busy = slotManager.busy;

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="gh-btn gh-btn-outline"
          onClick={() => slotManager.setSelectionMode(!slotManager.selectionMode)}
        >
          <CheckSquare className="size-3.5" aria-hidden />{" "}
          {slotManager.selectionMode ? "Selecting" : "Select"}
        </button>
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
      !slotManager.resizeTarget &&
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
          onSelectOpenSlot={setSelectedSlot}
          onSelectConsultation={setActiveConsult}
          onBlockSlot={(item) => {
            slotManager.setError(null);
            slotManager.setBlockTarget(item);
          }}
          onSelectBlockedSlot={(item) => void slotManager.setStatus(item, "OPEN")}
          onRemoveSlot={(item) => {
            slotManager.setError(null);
            slotManager.setRemoveTarget(item);
          }}
          onResizeSlot={(item) => {
            slotManager.setError(null);
            slotManager.setResizeTarget(item);
          }}
          selectionMode={slotManager.selectionMode}
          selectedIds={slotManager.selected}
          onToggleSelect={slotManager.toggleSelected}
          slotActionsBusy={busy}
          onPrevWeek={() => goToWeek(addWeeksKey(weekAnchor, -1))}
          onNextWeek={() => goToWeek(addWeeksKey(weekAnchor, 1))}
          onToday={() => goToWeek(todayKey(tz))}
        />
      </div>

      <SelectionActionBar
        count={slotManager.selected.size}
        busy={busy}
        onAction={(action) => void slotManager.bulkSelected(action)}
        onClear={slotManager.clearSelection}
      />

      <SlotManagerPanel
        tz={tz}
        defaultDate={weekAnchor}
        busy={busy}
        onSubmit={(action, spans, reason) =>
          void slotManager.bulkBySpans(action, spans, reason || undefined)
        }
      />

      <BookSlotDialog
        key={selectedSlot?.id ?? "none"}
        open={selectedSlot !== null}
        onClose={() => setSelectedSlot(null)}
        slot={selectedSlot}
        doctorId={doctorId}
        doctorName={doctorName}
        countryCode={countryCode}
        clinicTz={clinicTz}
        services={services}
        clinics={clinics}
        defaultDialCode={defaultDialCode}
        action={bookAction}
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
        doctorName={doctorName}
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

      <ResizeSlotDialog
        key={slotManager.resizeTarget?.id ?? "no-resize"}
        open={slotManager.resizeTarget !== null}
        slot={slotManager.resizeTarget}
        tz={tz}
        busy={busy}
        error={slotManager.error}
        onClose={() => {
          slotManager.setResizeTarget(null);
          slotManager.setError(null);
        }}
        onConfirm={(durationMinutes) => {
          const target = slotManager.resizeTarget;
          if (target) void slotManager.resize(target, durationMinutes);
        }}
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

      <EventDetailDialog
        item={activeConsult}
        tz={tz}
        onClose={() => setActiveConsult(null)}
      />
    </div>
  );
}

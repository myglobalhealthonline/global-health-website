"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { CURATED_TIME_ZONES } from "@/lib/timezones";
import {
  adminCreateSlots,
  adminRemoveSlot,
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
  // Block/unblock talks to the API from the client and then refreshes the
  // server-rendered week — the slot list comes from the page, not local state.
  const [blockTarget, setBlockTarget] = useState<CalendarItem | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CalendarItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Add reports partial success ("added 20, skipped 4"), which is information,
  // not an error — it gets its own line rather than the warning banner.
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  const [slotBusy, setSlotBusy] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const tzOptions = useMemo(() => {
    const set = new Set<string>([clinicTz, ...CURATED_TIME_ZONES]);
    return [...set];
  }, [clinicTz]);

  const weekDays = useMemo(() => weekDaysOf(weekAnchor), [weekAnchor]);
  const itemsByDay = useMemo(() => groupItemsByLocalDay(items, tz), [items, tz]);

  // Calendar ids are prefixed ("s-<slotId>") so slots and consultations can't
  // collide; the API wants the bare slot id.
  async function setSlotStatus(
    item: CalendarItem,
    status: "OPEN" | "BLOCKED",
    reason?: string,
  ) {
    setSlotError(null);
    setSlotBusy(true);
    const res = await adminToggleSlotStatus(
      doctorId,
      item.id.replace(/^s-/, ""),
      status,
      reason,
    );
    setSlotBusy(false);
    if (!res.ok) {
      setSlotError(res.message);
      return;
    }
    setBlockTarget(null);
    router.refresh();
  }

  // Removal deletes the slot for THIS date and records an availability
  // exception server-side, so the weekly window can't regenerate it.
  async function removeSlot(item: CalendarItem, reason?: string) {
    setSlotError(null);
    setSlotBusy(true);
    const res = await adminRemoveSlot(
      doctorId,
      item.id.replace(/^s-/, ""),
      reason,
    );
    setSlotBusy(false);
    if (!res.ok) {
      setSlotError(res.message);
      return;
    }
    setRemoveTarget(null);
    router.refresh();
  }

  // One-off slots over a date + time range of the admin's choosing — no weekly
  // window involved, so they also survive later edits to those windows.
  async function addSlots(startAtIsos: string[], durationMinutes: number) {
    setSlotError(null);
    setSlotBusy(true);
    const res = await adminCreateSlots(doctorId, startAtIsos, durationMinutes);
    setSlotBusy(false);
    if (!res.ok) {
      setSlotError(res.message);
      return;
    }
    setAddOpen(false);
    setSlotNotice(describeAddResult(res.data));
    router.refresh();
  }

  function goToWeek(anchor: string) {
    const params = new URLSearchParams();
    params.set("wk", anchor);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          className="gh-btn gh-btn-outline"
          onClick={() => {
            setSlotError(null);
            setSlotNotice(null);
            setAddOpen(true);
          }}
        >
          <Plus className="size-3.5" aria-hidden /> Add slots
        </button>
        <TimezoneSelect value={tz} options={tzOptions} onChange={setTz} />
      </div>

      {/* The dialogs render their own copy of the error — don't say it twice. */}
      {slotError && !blockTarget && !removeTarget && !addOpen ? (
        <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
          {slotError}
        </p>
      ) : null}
      {slotNotice ? (
        <p className="gh-status-success rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
          {slotNotice}
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
            setSlotError(null);
            setBlockTarget(item);
          }}
          onSelectBlockedSlot={(item) => void setSlotStatus(item, "OPEN")}
          onRemoveSlot={(item) => {
            setSlotError(null);
            setRemoveTarget(item);
          }}
          slotActionsBusy={slotBusy}
          onPrevWeek={() => goToWeek(addWeeksKey(weekAnchor, -1))}
          onNextWeek={() => goToWeek(addWeeksKey(weekAnchor, 1))}
          onToday={() => goToWeek(todayKey(tz))}
        />
      </div>

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
        key={blockTarget?.id ?? "no-block"}
        open={blockTarget !== null}
        slot={blockTarget}
        tz={tz}
        busy={slotBusy}
        error={slotError}
        onClose={() => {
          setBlockTarget(null);
          setSlotError(null);
        }}
        onConfirm={(reason) => {
          if (blockTarget) void setSlotStatus(blockTarget, "BLOCKED", reason || undefined);
        }}
      />

      <AddSlotDialog
        key={addOpen ? `add-${weekAnchor}` : "no-add"}
        open={addOpen}
        doctorName={doctorName}
        tz={tz}
        defaultDate={weekAnchor}
        busy={slotBusy}
        error={slotError}
        onClose={() => {
          setAddOpen(false);
          setSlotError(null);
        }}
        onConfirm={(startAtIsos, durationMinutes) =>
          void addSlots(startAtIsos, durationMinutes)
        }
      />

      <RemoveSlotDialog
        key={removeTarget?.id ?? "no-remove"}
        open={removeTarget !== null}
        slot={removeTarget}
        tz={tz}
        busy={slotBusy}
        error={slotError}
        onClose={() => {
          setRemoveTarget(null);
          setSlotError(null);
        }}
        onConfirm={(reason) => {
          if (removeTarget) void removeSlot(removeTarget, reason || undefined);
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

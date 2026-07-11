"use client";

import { useMemo, useState, useTransition } from "react";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
import { TimezoneSelect } from "@/components/calendar/TimezoneSelect";
import {
  addWeeksKey,
  groupItemsByLocalDay,
  todayKey,
  weekDaysOf,
  weekRangeIso,
} from "@/components/calendar/calendar-utils";
import { CURATED_TIME_ZONES } from "@/lib/timezones";
import {
  fetchAvailabilityRangeClient,
  toggleSlotStatus,
} from "@/lib/api/doctor-availability-client";
import type { DoctorTimeSlotView } from "@/lib/api/doctor-availability-types";

type Props = {
  initialSlots: DoctorTimeSlotView[];
  /** Booked consultations (all scheduled appointments), placed by local day. */
  consultations: CalendarItem[];
  clinicTz: string;
  /** Any date inside the initial week ("YYYY-MM-DD"), clinic-local. */
  initialWeekAnchor: string;
  onSlotsChange?: (slots: DoctorTimeSlotView[]) => void;
  strings: { weekViewHelp: string };
};

function slotsToItems(slots: DoctorTimeSlotView[]): CalendarItem[] {
  return slots.map((s) => ({
    id: s.id,
    kind: "slot" as const,
    startAt: s.startAt,
    endAt: s.endAt,
    status: s.status,
    title: s.status,
    meta: { blockReason: s.blockReason ?? null },
  }));
}

/** Doctor-side week calendar — same grid the admin availability page uses.
 *  Click an OPEN slot to block it, a BLOCKED slot to re-open, a booked block
 *  to see its detail. Week nav refetches that week's slots. */
export function DoctorAvailabilityWeekView({
  initialSlots,
  consultations,
  clinicTz,
  initialWeekAnchor,
  onSlotsChange,
  strings,
}: Props) {
  const [tz, setTz] = useState(clinicTz);
  const [weekAnchor, setWeekAnchor] = useState(initialWeekAnchor);
  const [slots, setSlots] = useState<DoctorTimeSlotView[]>(initialSlots);
  const [activeConsult, setActiveConsult] = useState<CalendarItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const tzOptions = useMemo(() => {
    const set = new Set<string>([clinicTz, ...CURATED_TIME_ZONES]);
    return [...set];
  }, [clinicTz]);

  const weekDays = useMemo(() => weekDaysOf(weekAnchor), [weekAnchor]);
  const items = useMemo(
    () => [...consultations, ...slotsToItems(slots)],
    [consultations, slots],
  );
  const itemsByDay = useMemo(() => groupItemsByLocalDay(items, tz), [items, tz]);

  function updateSlots(next: DoctorTimeSlotView[]) {
    setSlots(next);
    onSlotsChange?.(next);
  }

  function goToWeek(anchor: string) {
    setWeekAnchor(anchor);
    setError(null);
    startTransition(async () => {
      const { fromIso, toIso } = weekRangeIso(anchor, tz);
      const res = await fetchAvailabilityRangeClient(fromIso, toIso);
      if (res.ok) updateSlots(res.data.slots);
      else setError(res.message);
    });
  }

  function onToggleSlot(item: CalendarItem) {
    if (item.status !== "OPEN" && item.status !== "BLOCKED") return;
    const next = item.status === "OPEN" ? "BLOCKED" : "OPEN";
    setError(null);
    startTransition(async () => {
      const res = await toggleSlotStatus(item.id, next);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      updateSlots(
        slots.map((s) =>
          s.id === item.id
            ? { ...s, status: res.data.status as DoctorTimeSlotView["status"] }
            : s,
        ),
      );
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-portal-compact text-[var(--portal-muted)]">
          {strings.weekViewHelp}
        </p>
        <TimezoneSelect value={tz} options={tzOptions} onChange={setTz} />
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div
        aria-busy={busy}
        className={busy ? "pointer-events-none opacity-70 transition" : "transition"}
      >
        <WeekCalendar
          anchorDayKey={weekAnchor}
          weekDays={weekDays}
          itemsByDay={itemsByDay}
          tz={tz}
          todayKey={todayKey(tz)}
          onSelectOpenSlot={onToggleSlot}
          onSelectConsultation={setActiveConsult}
          onToggleSlot={onToggleSlot}
          onPrevWeek={() => goToWeek(addWeeksKey(weekAnchor, -1))}
          onNextWeek={() => goToWeek(addWeeksKey(weekAnchor, 1))}
          onToday={() => goToWeek(todayKey(tz))}
        />
      </div>

      <EventDetailDialog
        item={activeConsult}
        tz={tz}
        onClose={() => setActiveConsult(null)}
      />
    </div>
  );
}

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
  /** Lifted to the page's single error banner (05-005: no second banner here). */
  onError?: (message: string | null) => void;
  strings: {
    weekViewHelp: string;
    weekToday?: string;
    weekPrevAria?: string;
    weekNextAria?: string;
    weekClickToBlock?: string;
    weekClickToReopen?: string;
    weekBookThisTime?: string;
    weekLegendOpen?: string;
    weekLegendBooked?: string;
    weekLegendBlocked?: string;
  };
  eventDetailLabels?: Record<string, string>;
};

function slotsToItems(slots: DoctorTimeSlotView[]): CalendarItem[] {
  return slots.map((s) => {
    // A booked slot carries the patient behind it — surface their name as the
    // block label and thread the consultation detail into meta so clicking the
    // slot opens the same detail drawer the admin calendar shows.
    const booked = s.status === "BOOKED";
    return {
      id: s.id,
      kind: "slot" as const,
      startAt: s.startAt,
      endAt: s.endAt,
      status: s.status,
      title: booked && s.patientName ? s.patientName : s.status,
      meta: {
        blockReason: s.blockReason ?? null,
        patientName: s.patientName ?? null,
        consultationType: s.consultationType ?? null,
        meetingUrl: s.meetingUrl ?? null,
      },
    };
  });
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
  onError,
  strings,
  eventDetailLabels,
}: Props) {
  const [tz, setTz] = useState(clinicTz);
  const [weekAnchor, setWeekAnchor] = useState(initialWeekAnchor);
  const [slots, setSlots] = useState<DoctorTimeSlotView[]>(initialSlots);
  const [activeConsult, setActiveConsult] = useState<CalendarItem | null>(null);
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
    onError?.(null);
    startTransition(async () => {
      const { fromIso, toIso } = weekRangeIso(anchor, tz);
      const res = await fetchAvailabilityRangeClient(fromIso, toIso);
      if (res.ok) updateSlots(res.data.slots);
      else onError?.(res.message);
    });
  }

  function onToggleSlot(item: CalendarItem) {
    if (item.status !== "OPEN" && item.status !== "BLOCKED") return;
    const next = item.status === "OPEN" ? "BLOCKED" : "OPEN";
    onError?.(null);
    startTransition(async () => {
      const res = await toggleSlotStatus(item.id, next);
      if (!res.ok) {
        onError?.(res.message);
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
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-portal-compact text-[var(--portal-muted)]">
          {strings.weekViewHelp}
        </p>
        <TimezoneSelect value={tz} options={tzOptions} onChange={setTz} />
      </div>

      <div
        aria-busy={busy}
        className={
          busy
            ? "min-w-0 pointer-events-none opacity-70 transition"
            : "min-w-0 transition"
        }
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
          labels={{
            today: strings.weekToday,
            prevWeekAria: strings.weekPrevAria,
            nextWeekAria: strings.weekNextAria,
            clickToBlock: strings.weekClickToBlock,
            clickToReopen: strings.weekClickToReopen,
            bookThisTime: strings.weekBookThisTime,
            legendOpen: strings.weekLegendOpen,
            legendBooked: strings.weekLegendBooked,
            legendBlocked: strings.weekLegendBlocked,
          }}
        />
      </div>

      <EventDetailDialog
        item={activeConsult}
        tz={tz}
        viewerRole="doctor"
        onClose={() => setActiveConsult(null)}
        labels={eventDetailLabels}
      />
    </div>
  );
}

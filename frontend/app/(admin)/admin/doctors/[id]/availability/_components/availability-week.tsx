"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { CURATED_TIME_ZONES } from "@/lib/timezones";
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

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <TimezoneSelect value={tz} options={tzOptions} onChange={setTz} />
      </div>

      <WeekCalendar
        anchorDayKey={weekAnchor}
        weekDays={weekDays}
        itemsByDay={itemsByDay}
        tz={tz}
        todayKey={todayKey(tz)}
        onSelectOpenSlot={setSelectedSlot}
        onSelectConsultation={setActiveConsult}
        onPrevWeek={() => goToWeek(addWeeksKey(weekAnchor, -1))}
        onNextWeek={() => goToWeek(addWeeksKey(weekAnchor, 1))}
        onToday={() => goToWeek(todayKey(tz))}
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

      <EventDetailDialog
        item={activeConsult}
        tz={tz}
        onClose={() => setActiveConsult(null)}
      />
    </div>
  );
}

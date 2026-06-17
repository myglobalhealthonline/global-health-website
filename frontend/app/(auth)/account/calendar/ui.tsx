"use client";

import { useMemo, useState } from "react";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
import {
  addMonths,
  groupItemsByLocalDay,
  todayKey,
} from "@/components/calendar/calendar-utils";

const DEFAULT_TZ = "Europe/Dublin";

function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}

export function PatientCalendarUI({
  items,
  defaultTz,
}: {
  items: CalendarItem[];
  defaultTz: string | null;
}) {
  // Render in the patient's booking timezone when we captured one, else the
  // browser's current zone.
  const [tz] = useState<string>(() => defaultTz ?? browserTz());
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selectedDay, setSelectedDay] = useState<string>(() => todayKey(tz));
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);

  const itemsByDay = useMemo(() => groupItemsByLocalDay(items, tz), [items, tz]);
  const dayItems = selectedDay ? itemsByDay.get(selectedDay) ?? [] : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <MonthCalendar
        year={ym.year}
        month={ym.month}
        itemsByDay={itemsByDay}
        selectedDay={selectedDay}
        todayKey={todayKey(tz)}
        onSelectDay={setSelectedDay}
        onPrevMonth={() => setYm((p) => addMonths(p.year, p.month, -1))}
        onNextMonth={() => setYm((p) => addMonths(p.year, p.month, 1))}
        onToday={() => {
          const d = new Date();
          setYm({ year: d.getFullYear(), month: d.getMonth() + 1 });
          setSelectedDay(todayKey(tz));
        }}
      />

      <DayAgenda
        dayKey={selectedDay}
        items={dayItems}
        tz={tz}
        emptyLabel="No consultations on this day."
        showDoctorName
        onSelectConsultation={setActiveItem}
      />

      <EventDetailDialog item={activeItem} tz={tz} onClose={() => setActiveItem(null)} />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
import { AppSheet } from "@/components/AppSheet";
import {
  addMonths,
  dayLabel,
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
  emptyLabel = "No consultations on this day.",
  emptyHint,
  dayAgendaLabel = "Day agenda",
}: {
  items: CalendarItem[];
  defaultTz: string | null;
  emptyLabel?: string;
  emptyHint?: string;
  dayAgendaLabel?: string;
}) {
  // Render in the patient's booking timezone when we captured one, else the
  // browser's current zone.
  const [tz] = useState<string>(() => defaultTz ?? browserTz());
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [selectedDay, setSelectedDay] = useState<string>(() => todayKey(tz));
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);

  const itemsByDay = useMemo(() => groupItemsByLocalDay(items, tz), [items, tz]);
  const dayItems = selectedDay ? itemsByDay.get(selectedDay) ?? [] : [];

  function openDay(key: string) {
    setSelectedDay(key);
    setDaySheetOpen(true);
  }

  function openEvent(item: CalendarItem) {
    setDaySheetOpen(false);
    setActiveItem(item);
  }

  return (
    <div className="gh-patient-calendar grid gap-4">
      <MonthCalendar
        year={ym.year}
        month={ym.month}
        itemsByDay={itemsByDay}
        selectedDay={selectedDay}
        todayKey={todayKey(tz)}
        onSelectDay={openDay}
        onPrevMonth={() => setYm((p) => addMonths(p.year, p.month, -1))}
        onNextMonth={() => setYm((p) => addMonths(p.year, p.month, 1))}
        onToday={() => {
          const d = new Date();
          setYm({ year: d.getFullYear(), month: d.getMonth() + 1 });
          setSelectedDay(todayKey(tz));
        }}
      />

      {/* Day agenda — lux sheet, same composition as admin/doctor calendars. */}
      <AppSheet
        open={daySheetOpen}
        onOpenChange={setDaySheetOpen}
        size="md"
        theme="portal"
        header={
          <div className="gh-record-drawer__title-block">
            <span className="gh-record-drawer__eyebrow">{dayAgendaLabel}</span>
            <Dialog.Title asChild>
              <h2 className="gh-record-drawer__title">
                {selectedDay ? dayLabel(selectedDay) : ""}
              </h2>
            </Dialog.Title>
          </div>
        }
      >
        <DayAgenda
          dayKey={selectedDay}
          items={dayItems}
          tz={tz}
          hideHeader
          emptyLabel={emptyLabel}
          emptyHint={emptyHint}
          showDoctorName
          onSelectConsultation={openEvent}
        />
      </AppSheet>

      <EventDetailDialog
        item={activeItem}
        tz={tz}
        onClose={() => setActiveItem(null)}
        viewerRole="patient"
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
import { TimezoneSelect } from "@/components/calendar/TimezoneSelect";
import {
  addMonths,
  groupItemsByLocalDay,
  todayKey,
  yearMonthParam,
} from "@/components/calendar/calendar-utils";
import { CURATED_TIME_ZONES } from "@/lib/timezones";

type Option = { id: string; name: string };

type Props = {
  year: number;
  month: number;
  items: CalendarItem[];
  doctorOptions: Option[];
  typeOptions: string[];
  countryOptions: string[];
  filters: { doctorId: string; type: string; country: string };
};

// Admin spans every country, so the calendar defaults to Ireland time and
// the admin can switch to any curated zone to read the grid in.
const DEFAULT_TZ = "Europe/Dublin";

export function AdminCalendarUI({
  year,
  month,
  items,
  doctorOptions,
  typeOptions,
  countryOptions,
  filters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [tz, setTz] = useState<string>(DEFAULT_TZ);
  const [selectedDay, setSelectedDay] = useState<string>(() => todayKey(DEFAULT_TZ));
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);

  const tzList = useMemo(() => [...CURATED_TIME_ZONES] as string[], []);

  const itemsByDay = useMemo(() => groupItemsByLocalDay(items, tz), [items, tz]);
  const dayItems = selectedDay ? itemsByDay.get(selectedDay) ?? [] : [];

  function pushParams(next: Partial<{ ym: string; doctorId: string; type: string; country: string }>) {
    const params = new URLSearchParams();
    params.set("ym", next.ym ?? yearMonthParam(year, month));
    const doctorId = next.doctorId ?? filters.doctorId;
    const type = next.type ?? filters.type;
    const country = next.country ?? filters.country;
    if (doctorId) params.set("doctorId", doctorId);
    if (type) params.set("type", type);
    if (country) params.set("country", country);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="gh-admin-calendar-ui grid gap-4">
      {/* Filters */}
      <div className="gh-admin-calendar-filters flex flex-wrap items-end justify-between gap-3">
        <div className="gh-admin-calendar-filter-grid flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">Doctor</span>
            <select
              className="gh-select h-10 min-w-[160px]"
              value={filters.doctorId}
              onChange={(e) => pushParams({ doctorId: e.target.value })}
            >
              <option value="">All doctors</option>
              {doctorOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">Type</span>
            <select
              className="gh-select h-10 min-w-[150px]"
              value={filters.type}
              onChange={(e) => pushParams({ type: e.target.value })}
            >
              <option value="">All types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">Country</span>
            <select
              className="gh-select h-10 min-w-[120px]"
              value={filters.country}
              onChange={(e) => pushParams({ country: e.target.value })}
            >
              <option value="">All countries</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TimezoneSelect value={tz} options={tzList} onChange={setTz} />
      </div>

      <div className="gh-admin-calendar-grid grid gap-4 lg:grid-cols-[1fr_360px]">
        <MonthCalendar
          year={year}
          month={month}
          itemsByDay={itemsByDay}
          selectedDay={selectedDay}
          todayKey={todayKey(tz)}
          onSelectDay={setSelectedDay}
          onPrevMonth={() =>
            pushParams({ ym: yearMonthParam(...monthTuple(addMonths(year, month, -1))) })
          }
          onNextMonth={() =>
            pushParams({ ym: yearMonthParam(...monthTuple(addMonths(year, month, 1))) })
          }
          onToday={() => {
            const d = new Date();
            pushParams({ ym: yearMonthParam(d.getFullYear(), d.getMonth() + 1) });
            setSelectedDay(todayKey(tz));
          }}
        />

        <DayAgenda
          dayKey={selectedDay}
          items={dayItems}
          tz={tz}
          emptyLabel="No consultations or slots on this day."
          showDoctorName
          onSelectConsultation={setActiveItem}
        />
      </div>

      <EventDetailDialog item={activeItem} tz={tz} onClose={() => setActiveItem(null)} />
    </div>
  );
}

function monthTuple(ym: { year: number; month: number }): [number, number] {
  return [ym.year, ym.month];
}

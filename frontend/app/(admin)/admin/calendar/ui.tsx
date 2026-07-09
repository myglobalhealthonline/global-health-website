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

type SlotAgendaFilter = "reserved" | "all" | "open" | "booked" | "blocked";

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
  // Default to "all" so open (bookable) slots — and their Book action — are
  // visible as soon as a day is picked.
  const [slotFilter, setSlotFilter] = useState<SlotAgendaFilter>("all");

  const tzList = useMemo(() => [...CURATED_TIME_ZONES] as string[], []);

  const itemsByDay = useMemo(() => groupItemsByLocalDay(items, tz), [items, tz]);
  const dayItems = selectedDay ? itemsByDay.get(selectedDay) ?? [] : [];
  const agendaItems = dayItems.filter((i) => {
    if (i.kind !== "slot") return true;
    switch (slotFilter) {
      case "all":
        return true;
      case "open":
        return i.status === "OPEN";
      case "booked":
        return i.status === "BOOKED";
      case "blocked":
        return i.status === "BLOCKED";
      case "reserved":
      default:
        return i.status !== "OPEN";
    }
  });

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

      <div
        className="gh-admin-calendar-legend flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{ color: "var(--portal-muted)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <LegendDot tone="var(--portal-success)" label="Open" />
          <LegendDot tone="var(--portal-info)" label="Booked" />
          <LegendDot tone="var(--portal-danger)" label="Blocked" />
        </div>
        <label
          className="flex items-center gap-2 text-xs font-semibold"
          style={{ color: "var(--portal-text-2)" }}
        >
          Agenda slots
          <select
            className="gh-select h-8 text-xs"
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value as SlotAgendaFilter)}
          >
            <option value="reserved">Booked &amp; blocked</option>
            <option value="all">All (incl. available)</option>
            <option value="open">Available only</option>
            <option value="booked">Booked only</option>
            <option value="blocked">Blocked only</option>
          </select>
        </label>
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
          items={agendaItems}
          tz={tz}
          emptyLabel={
            slotFilter === "all"
              ? "No consultations or slots on this day."
              : "Nothing matching this filter on this day. Try “All (incl. available)” in the Agenda slots dropdown."
          }
          showDoctorName
          onSelectConsultation={setActiveItem}
          renderSlotAction={(item) => {
            // Only genuinely bookable inventory gets the deep link into the
            // manual-booking form, prefilled with doctor + slot.
            if (item.status !== "OPEN" || !item.meta?.doctorId || !item.meta?.countryCode) {
              return null;
            }
            const params = new URLSearchParams({
              countryCode: item.meta.countryCode,
              doctorId: item.meta.doctorId,
              slotId: item.id.replace(/^s-/, ""),
            });
            return (
              <a
                href={`/admin/appointments/new?${params.toString()}`}
                className="ml-0.5 rounded-full border border-current px-1.5 text-[10px] font-bold uppercase tracking-wide hover:opacity-80"
              >
                Book
              </a>
            );
          }}
        />
      </div>

      <EventDetailDialog item={activeItem} tz={tz} onClose={() => setActiveItem(null)} />
    </div>
  );
}

function monthTuple(ym: { year: number; month: number }): [number, number] {
  return [ym.year, ym.month];
}

function LegendDot({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}

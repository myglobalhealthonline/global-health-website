"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
import { TimezoneSelect } from "@/components/calendar/TimezoneSelect";
import { AppSheet } from "@/components/AppSheet";
import {
  addMonths,
  addWeeksKey,
  dayLabel,
  groupItemsByLocalDay,
  todayKey,
  weekDaysOf,
  yearMonthParam,
} from "@/components/calendar/calendar-utils";
import { ADMIN_CALENDAR_DEFAULT_TZ, CURATED_TIME_ZONES } from "@/lib/timezones";
import { adminToggleSlotStatus } from "@/lib/api/admin-slot-client";

type Option = { id: string; name: string };

type CalendarView = "month" | "week";

type Props = {
  year: number;
  month: number;
  view: CalendarView;
  /** Any calendar date inside the week the week-view renders ("YYYY-MM-DD"). */
  weekAnchor: string;
  items: CalendarItem[];
  doctorOptions: Option[];
  typeOptions: string[];
  countryOptions: string[];
  filters: { doctorId: string; type: string; country: string };
};

const DEFAULT_TZ = ADMIN_CALENDAR_DEFAULT_TZ;

type SlotAgendaFilter = "reserved" | "all" | "open" | "booked" | "blocked";

export function AdminCalendarUI({
  year,
  month,
  view,
  weekAnchor,
  items,
  doctorOptions,
  typeOptions,
  countryOptions,
  filters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tz, setTz] = useState<string>(DEFAULT_TZ);
  const [selectedDay, setSelectedDay] = useState<string>(() => todayKey(DEFAULT_TZ));
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [slotBusy, setSlotBusy] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(() => {
    const eventId = searchParams.get("event");
    return eventId ? items.find((i) => i.id === eventId) ?? null : null;
  });

  function openEvent(item: CalendarItem) {
    // Event drawer replaces the day sheet — no stacked overlays.
    setDaySheetOpen(false);
    setActiveItem(item);
    const next = new URLSearchParams(searchParams.toString());
    next.set("event", item.id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function openDay(key: string) {
    setSelectedDay(key);
    setDaySheetOpen(true);
  }

  // Unblocking returns the slot to bookable inventory, so re-read the day from
  // the server rather than patching local state — the agenda is server-rendered.
  async function onUnblockSlot(item: CalendarItem) {
    const doctorId = item.meta?.doctorId;
    if (!doctorId || item.status !== "BLOCKED") return;
    setSlotError(null);
    setSlotBusy(true);
    const res = await adminToggleSlotStatus(doctorId, item.id.replace(/^s-/, ""), "OPEN");
    setSlotBusy(false);
    if (!res.ok) {
      setSlotError(res.message);
      return;
    }
    router.refresh();
  }
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

  function pushParams(
    next: Partial<{
      ym: string;
      doctorId: string;
      type: string;
      country: string;
      view: CalendarView;
      wk: string;
    }>,
  ) {
    const params = new URLSearchParams();
    params.set("ym", next.ym ?? yearMonthParam(year, month));
    const doctorId = next.doctorId ?? filters.doctorId;
    const type = next.type ?? filters.type;
    const country = next.country ?? filters.country;
    if (doctorId) params.set("doctorId", doctorId);
    if (type) params.set("type", type);
    if (country) params.set("country", country);
    // Week is the default, so only Month is spelled out in the URL.
    const nextView = next.view ?? view;
    if (nextView === "month") {
      params.set("view", "month");
    } else {
      params.set("wk", next.wk ?? weekAnchor);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  // `ym` rides along with the anchor so flipping back to Month lands on the
  // month the admin was just reading, not the one they started from.
  function goToWeek(anchor: string) {
    pushParams({ view: "week", wk: anchor, ym: anchor.slice(0, 7) });
  }

  // Same deep link the day agenda's "Book" action uses: an open slot in the
  // week grid starts a manual booking prefilled with doctor + slot.
  function startSlotBooking(item: CalendarItem) {
    if (!item.meta?.doctorId || !item.meta?.countryCode) return;
    const params = new URLSearchParams({
      countryCode: item.meta.countryCode,
      doctorId: item.meta.doctorId,
      slotId: item.id.replace(/^s-/, ""),
    });
    router.push(`/admin/appointments/new?${params.toString()}`);
  }

  const weekDays = useMemo(() => weekDaysOf(weekAnchor), [weekAnchor]);

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
        <div className="flex items-center gap-2">
          <ViewToggle
            view={view}
            onChange={(next) =>
              next === "week"
                ? goToWeek(selectedDay || todayKey(tz))
                : pushParams({ view: "month" })
            }
          />
          <TimezoneSelect value={tz} options={tzList} onChange={setTz} />
        </div>
      </div>

      <div
        className="gh-admin-calendar-legend flex flex-wrap items-center gap-3 text-xs"
        style={{ color: "var(--portal-muted)" }}
      >
        <LegendDot tone="var(--portal-success)" label="Open" />
        <LegendDot tone="var(--portal-info)" label="Booked" />
        <LegendDot tone="var(--portal-danger)" label="Blocked" />
      </div>

      {view === "week" ? (
        <WeekCalendar
          anchorDayKey={weekAnchor}
          weekDays={weekDays}
          itemsByDay={itemsByDay}
          tz={tz}
          todayKey={todayKey(tz)}
          onSelectOpenSlot={startSlotBooking}
          onSelectConsultation={openEvent}
          onPrevWeek={() => goToWeek(addWeeksKey(weekAnchor, -1))}
          onNextWeek={() => goToWeek(addWeeksKey(weekAnchor, 1))}
          onToday={() => goToWeek(todayKey(tz))}
          // Filtered to one doctor, the name on every block is noise the
          // filter already states.
          showDoctorName={!filters.doctorId}
        />
      ) : (
        <MonthCalendar
          year={year}
          month={month}
          itemsByDay={itemsByDay}
          selectedDay={selectedDay}
          todayKey={todayKey(tz)}
          onSelectDay={openDay}
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
      )}

      {/* Day agenda — lux sheet, same skin as the event drawer. */}
      <AppSheet
        open={daySheetOpen}
        onOpenChange={setDaySheetOpen}
        size="md"
        theme="portal"
        header={
          <div className="gh-record-drawer__title-block">
            <span className="gh-record-drawer__eyebrow">Day agenda</span>
            <Dialog.Title asChild>
              <h2 className="gh-record-drawer__title">
                {selectedDay ? dayLabel(selectedDay) : ""}
              </h2>
            </Dialog.Title>
          </div>
        }
      >
        <label
          className="mb-3 flex items-center justify-end gap-2 text-xs font-semibold"
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

        {slotError ? (
          <p className="gh-status-warning mb-3 rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
            {slotError}
          </p>
        ) : null}

        <DayAgenda
          dayKey={selectedDay}
          items={agendaItems}
          tz={tz}
          hideHeader
          emptyLabel={
            slotFilter === "all"
              ? "No consultations or slots on this day."
              : "Nothing matching this filter on this day. Try “All (incl. available)” in the Agenda slots dropdown."
          }
          showDoctorName
          onSelectConsultation={openEvent}
          // Blocked-only: OPEN chips render a "Book" link below, and a link
          // cannot nest inside a button.
          canToggleSlot={(item) => item.status === "BLOCKED" && Boolean(item.meta?.doctorId)}
          onSelectSlot={onUnblockSlot}
          slotActionsBusy={slotBusy}
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
                className="ml-0.5 rounded-full border border-current px-1.5 text-portal-micro font-bold uppercase tracking-wide hover:opacity-80"
              >
                Book
              </a>
            );
          }}
        />
      </AppSheet>

      <EventDetailDialog
        item={activeItem}
        tz={tz}
        paramKey="event"
        onClose={() => setActiveItem(null)}
      />
    </div>
  );
}

function monthTuple(ym: { year: number; month: number }): [number, number] {
  return [ym.year, ym.month];
}

/** Month ↔ Week segmented control. The view lives in the URL (`view=week`),
 *  so a week the admin is reading survives a refresh and can be linked to. */
function ViewToggle({
  view,
  onChange,
}: {
  view: CalendarView;
  onChange: (next: CalendarView) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Calendar view"
      className="inline-flex items-center gap-0.5 rounded-[999px] p-0.5"
      style={{ border: "1px solid var(--portal-line-strong)" }}
    >
      {(["month", "week"] as const).map((v) => {
        const active = v === view;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            className="gh-calendar-view-btn rounded-[999px] px-3 py-1 text-xs font-semibold capitalize"
            style={
              active
                ? { background: "var(--portal-info)", color: "#fff" }
                : { color: "var(--portal-text)" }
            }
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

function LegendDot({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}

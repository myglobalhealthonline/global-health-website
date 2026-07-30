"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus } from "lucide-react";
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
import {
  AddSlotDialog,
  describeAddResult,
} from "@/components/calendar/add-slot-dialog";
import { BlockSlotDialog } from "@/components/calendar/block-slot-dialog";
import { RemoveSlotDialog } from "@/components/calendar/remove-slot-dialog";
import { ADMIN_CALENDAR_DEFAULT_TZ, CURATED_TIME_ZONES } from "@/lib/timezones";
import { SelectionActionBar } from "@/components/calendar/selection-action-bar";
import { SlotManagerPanel } from "@/components/calendar/slot-manager-panel";
import { describeBulkResult } from "@/lib/calendar/bulk-result-copy";
import type { BulkSlotAction } from "@/lib/api/slot-bulk-types";
import {
  adminBulkSlotAction,
  adminCreateSlots,
  adminRemoveSlot,
  adminToggleSlotStatus,
} from "@/lib/api/admin-slot-client";

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
  /** Display state of the filter bar. `country` is the *effective* country —
   *  it includes the header picker's scope, which is why it differs from
   *  `countryParam`. */
  filters: { doctorId: string; type: string; country: string };
  /** The `country` search param exactly as it arrived (empty when the scope
   *  came from the header picker). Carried forward when other filters change
   *  so an untouched calendar keeps following the picker. */
  countryParam: string;
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
  countryParam,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tz, setTz] = useState<string>(DEFAULT_TZ);
  const [selectedDay, setSelectedDay] = useState<string>(() => todayKey(DEFAULT_TZ));
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [slotBusy, setSlotBusy] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<CalendarItem | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CalendarItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Add reports partial success ("added 20, skipped 4") — information, not an
  // error, so it gets its own line rather than the warning banner.
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  // Bulk work is per-doctor: the endpoint is scoped to one calendar, and a
  // sweep across every doctor at once is not a thing an admin should be able to
  // do by accident. Both affordances therefore need the doctor filter set.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulkReady = Boolean(filters.doctorId);
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

  // Block/unblock returns the slot to (or takes it out of) bookable inventory,
  // so re-read the day from the server rather than patching local state — the
  // grid and agenda are both server-rendered.
  async function setSlotStatus(
    item: CalendarItem,
    status: "OPEN" | "BLOCKED",
    reason?: string,
  ) {
    const doctorId = item.meta?.doctorId;
    if (!doctorId) {
      setSlotError("This slot has no doctor — reload the calendar and try again.");
      return;
    }
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

  function onUnblockSlot(item: CalendarItem) {
    if (item.status !== "BLOCKED") return;
    void setSlotStatus(item, "OPEN");
  }

  // Removal deletes the slot for THIS date and records an availability
  // exception server-side, so the weekly window can't regenerate it.
  async function removeSlot(item: CalendarItem, reason?: string) {
    const doctorId = item.meta?.doctorId;
    if (!doctorId) {
      setSlotError("This slot has no doctor — reload the calendar and try again.");
      return;
    }
    setSlotError(null);
    setSlotBusy(true);
    const res = await adminRemoveSlot(doctorId, item.id.replace(/^s-/, ""), reason);
    setSlotBusy(false);
    if (!res.ok) {
      setSlotError(res.message);
      return;
    }
    setRemoveTarget(null);
    router.refresh();
  }

  // One-off slots for the doctor the calendar is filtered to. The grid can show
  // every doctor at once, so "which doctor" has to come from the filter — the
  // button is disabled until one is picked.
  async function addSlots(startAtIsos: string[], durationMinutes: number) {
    if (!filters.doctorId) return;
    setSlotError(null);
    setSlotBusy(true);
    const res = await adminCreateSlots(filters.doctorId, startAtIsos, durationMinutes);
    setSlotBusy(false);
    if (!res.ok) {
      setSlotError(res.message);
      return;
    }
    setAddOpen(false);
    setSlotNotice(describeAddResult(res.data));
    router.refresh();
  }

  function openRemoveDialog(item: CalendarItem) {
    if (item.kind !== "slot") return;
    if (item.status !== "OPEN" && item.status !== "BLOCKED") return;
    if (!item.meta?.doctorId) return;
    setDaySheetOpen(false);
    setSlotError(null);
    setRemoveTarget(item);
  }

  function toggleSelected(item: CalendarItem) {
    const id = item.id.replace(/^s-/, "");
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Bulk over the current selection, or over a date × time sweep. Both post to
   *  the doctor-scoped bulk endpoint, which skips booked and held slots. */
  async function runBulk(
    action: BulkSlotAction,
    payload: { slotIds?: string[]; spans?: { fromUtc: string; toUtc: string }[] },
    reason?: string,
  ) {
    if (!filters.doctorId) return;
    setSlotError(null);
    setSlotBusy(true);
    const res = await adminBulkSlotAction(filters.doctorId, {
      action,
      ...payload,
      ...(reason ? { reason } : {}),
    });
    setSlotBusy(false);
    if (!res.ok) {
      setSlotError(res.message);
      return;
    }
    if (payload.slotIds) setSelected(new Set());
    setSlotNotice(describeBulkResult(action, res.data));
    router.refresh();
  }

  function openBlockDialog(item: CalendarItem) {
    if (item.status !== "OPEN" || !item.meta?.doctorId) return;
    // Same composition rule as openEvent: the dialog replaces the day sheet
    // rather than stacking on top of it.
    setDaySheetOpen(false);
    setSlotError(null);
    setBlockTarget(item);
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
    const country = next.country ?? countryParam;
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
    // Next caches the RSC payload per URL on the client, so navigating to a
    // week or month you visited before a mutation would replay the stale one.
    router.refresh();
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

  // What the Manage panel sweeps when its date fields are left blank: whatever
  // stretch is on screen.
  const visibleRange = useMemo(() => {
    if (view === "week") {
      return {
        from: weekDays[0]?.key ?? weekAnchor,
        to: weekDays[weekDays.length - 1]?.key ?? weekAnchor,
      };
    }
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      from: `${year}-${pad(month)}-01`,
      to: `${year}-${pad(month)}-${pad(last)}`,
    };
  }, [view, weekDays, weekAnchor, year, month]);

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
              // The doctor filter is country-scoped, so a doctor picked under
              // the old country would otherwise survive into an empty grid.
              onChange={(e) => pushParams({ country: e.target.value, doctorId: "" })}
            >
              <option value="all">All countries</option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="gh-btn gh-btn-outline"
            disabled={!filters.doctorId}
            title={
              filters.doctorId
                ? "Add one-off slots for this doctor"
                : "Pick a doctor first — slots belong to one calendar"
            }
            onClick={() => {
              setSlotError(null);
              setSlotNotice(null);
              setAddOpen(true);
            }}
          >
            <Plus className="size-3.5" aria-hidden /> Add slots
          </button>
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

      {/* Block/unblock failures on the week grid have no drawer to land in —
          and the dialog shows its own copy while it's open. */}
      {slotError &&
      !blockTarget &&
      !removeTarget &&
      !addOpen &&
      !daySheetOpen ? (
        <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
          {slotError}
        </p>
      ) : null}
      {slotNotice ? (
        <p className="gh-status-success rounded-[var(--radius-card-sm)] border px-3 py-2 text-portal-compact">
          {slotNotice}
        </p>
      ) : null}

      {view === "week" ? (
        <WeekCalendar
          anchorDayKey={weekAnchor}
          weekDays={weekDays}
          itemsByDay={itemsByDay}
          tz={tz}
          todayKey={todayKey(tz)}
          onSelectOpenSlot={startSlotBooking}
          onSelectConsultation={openEvent}
          onBlockSlot={openBlockDialog}
          onSelectBlockedSlot={onUnblockSlot}
          onRemoveSlot={openRemoveDialog}
          selectedIds={selected}
          onToggleSelect={bulkReady ? toggleSelected : undefined}
          slotActionsBusy={slotBusy}
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

      <SelectionActionBar
        count={selected.size}
        busy={slotBusy}
        onAction={(action) => void runBulk(action, { slotIds: [...selected] })}
        onClear={() => setSelected(new Set())}
      />

      {/* Range sweep — one doctor at a time, same rule as the other bulk work. */}
      {bulkReady ? (
        <SlotManagerPanel
          tz={tz}
          fallbackFrom={visibleRange.from}
          fallbackTo={visibleRange.to}
          weekdayLabels={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
          busy={slotBusy}
          onSubmit={(action, spans, reason) => void runBulk(action, { spans }, reason)}
        />
      ) : null}

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
          selectedIds={selected}
          onToggleSelect={bulkReady ? toggleSelected : undefined}
          // Every slot action is an explicit chip button (Book / Block /
          // Re-open / Remove), so the chip itself is never a button — nesting
          // them would be invalid markup.
          canToggleSlot={() => false}
          slotActionsBusy={slotBusy}
          renderSlotAction={(item) => {
            if (!item.meta?.doctorId) return null;
            if (item.status !== "OPEN" && item.status !== "BLOCKED") return null;
            // Only genuinely bookable inventory gets the deep link into the
            // manual-booking form, prefilled with doctor + slot.
            const params =
              item.status === "OPEN" && item.meta.countryCode
                ? new URLSearchParams({
                    countryCode: item.meta.countryCode,
                    doctorId: item.meta.doctorId,
                    slotId: item.id.replace(/^s-/, ""),
                  })
                : null;
            const actionClass =
              "ml-0.5 rounded-full border border-current px-1.5 text-portal-micro font-bold uppercase tracking-wide hover:opacity-80 disabled:opacity-50";
            return (
              <>
                {params ? (
                  <a href={`/admin/appointments/new?${params.toString()}`} className={actionClass}>
                    Book
                  </a>
                ) : null}
                <button
                  type="button"
                  disabled={slotBusy}
                  onClick={() =>
                    item.status === "OPEN" ? openBlockDialog(item) : onUnblockSlot(item)
                  }
                  className={actionClass}
                >
                  {item.status === "OPEN" ? "Block" : "Re-open"}
                </button>
                <button
                  type="button"
                  disabled={slotBusy}
                  onClick={() => openRemoveDialog(item)}
                  className={actionClass}
                >
                  Remove
                </button>
              </>
            );
          }}
        />
      </AppSheet>

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
        key={addOpen ? `add-${selectedDay}` : "no-add"}
        open={addOpen}
        doctorName={doctorOptions.find((d) => d.id === filters.doctorId)?.name ?? null}
        tz={tz}
        defaultDate={view === "week" ? weekAnchor : selectedDay || todayKey(tz)}
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

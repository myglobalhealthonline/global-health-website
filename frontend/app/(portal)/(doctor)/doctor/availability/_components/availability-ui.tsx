"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Pencil,
  Plus,
  Trash2,
  Unlock,
  UserRound,
} from "lucide-react";
import {
  bulkSlotAction,
  createAvailabilityWindow,
  createSlots,
  deleteAvailabilityWindow,
  removeSlot as removeSlotRequest,
  toggleSlotStatus,
  updateAvailabilityWindow,
} from "@/lib/api/doctor-availability-client";
import type {
  AvailabilityWindow,
  DoctorTimeSlotView,
} from "@/lib/api/doctor-availability-types";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { WeekCalendar } from "@/components/calendar/WeekCalendar";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
import { TimezoneSelect } from "@/components/calendar/TimezoneSelect";
import { ViewToggle, type CalendarView } from "@/components/calendar/view-toggle";
import { AddAvailabilityDialog } from "@/components/calendar/add-availability-dialog";
import { RemoveSlotDialog } from "@/components/calendar/remove-slot-dialog";
import { SelectionActionBar } from "@/components/calendar/selection-action-bar";
import { describeAddResult } from "@/components/calendar/add-slot-dialog";
import { describeBulkResult } from "@/lib/calendar/bulk-result-copy";
import { countRangeSlots, expandDaySpans } from "@/lib/calendar/expand-range";
import type { BulkSlotAction } from "@/lib/api/slot-bulk-types";
import { useSlotManager } from "@/lib/calendar/use-slot-manager";
import {
  addDaysKey,
  addMonths,
  addWeeksKey,
  dayLabel,
  groupItemsByLocalDay,
  todayKey,
  weekDaysOf,
  yearMonthParam,
} from "@/components/calendar/calendar-utils";
import { AppSheet } from "@/components/AppSheet";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  Btn,
  Pill,
  SectionHeader,
} from "@/components/portal-atoms";
import { PortalDialog } from "@/components/PortalDialog";
import { BASE_SLOT_MINUTES } from "@/lib/constants";
import { CURATED_TIME_ZONES } from "@/lib/timezones";
import {
  endTimeToMinutes,
  minutesToTimeInput,
  minutesToTimeLabel,
  timeToMinutes,
} from "@/lib/time-of-day";

type AvailabilityStrings = Record<string, string>;
type CommonStrings = Record<string, string>;

const TZ_STORAGE_KEY = "gh-doctor-cal-tz";

// The edit form lives in the dialog body while its submit button lives in the
// dialog footer — the `form` attribute associates them across that boundary.
const EDIT_FORM_ID = "gh-edit-window-form";

// Window labels render end-of-day as "24:00"; the edit form's <input type="time">
// needs the same minute as "00:00" (see @/lib/time-of-day).
const minutesToTime = minutesToTimeLabel;

// Effective dates are stored as UTC instants pinned to the start/end of the
// chosen day, so the ISO date part round-trips straight back into a date input.
function isoToDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

// Effective-date ranges overlap when both are unbounded or bounded ends cross;
// null/"" means "always" on that side. Dates compare fine as YYYY-MM-DD strings.
function dateRangesOverlap(
  aFrom: string | null,
  aUntil: string | null,
  bFrom: string,
  bUntil: string,
): boolean {
  const aFromD = aFrom ? aFrom.slice(0, 10) : null;
  const aUntilD = aUntil ? aUntil.slice(0, 10) : null;
  const bFromD = bFrom || null;
  const bUntilD = bUntil || null;
  const startsBeforeOtherEnds = !aUntilD || !bFromD || aUntilD >= bFromD;
  const endsAfterOtherStarts = !aFromD || !bUntilD || aFromD <= bUntilD;
  return startsBeforeOtherEnds && endsAfterOtherStarts;
}

/** Slot rows → calendar items. Booked slots keep their patient so the grid can
 *  render the name and open the detail drawer, same as a consultation block. */
function slotsToItems(slots: DoctorTimeSlotView[]): CalendarItem[] {
  return slots.map((s) => ({
    id: s.id,
    kind: "slot" as const,
    startAt: s.startAt,
    endAt: s.endAt,
    status: s.status,
    title: s.status,
    meta: {
      blockReason: s.blockReason ?? null,
      patientName: s.patientName ?? null,
      consultationType: s.consultationType ?? null,
      meetingUrl: s.meetingUrl ?? null,
    },
  }));
}

type Props = {
  initialWindows: AvailabilityWindow[];
  initialSlots: DoctorTimeSlotView[];
  /** Booked consultations for the visible range. */
  consultations: CalendarItem[];
  view: CalendarView;
  /** Any date inside the visible week ("YYYY-MM-DD"), clinic-local. */
  weekAnchor: string;
  year: number;
  month: number;
  /** Clinic timezone (Country.bookingSetting.timezone). Window minutes are
   *  wall-clock in this zone and concrete slots render in it. */
  countryTimeZone: string;
  availableTimezones: string[];
  strings: AvailabilityStrings;
  common: CommonStrings;
  /** Slot/dialog/event-detail copy lives in the calendar namespace — the two
   *  pages that merged into this one already shared it that way. */
  calendarStrings: Record<string, string>;
};

export function DoctorAvailabilityUI({
  initialWindows,
  initialSlots,
  consultations,
  view,
  weekAnchor,
  year,
  month,
  countryTimeZone,
  availableTimezones,
  strings: s,
  common,
  calendarStrings: c,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Sunday-first, matching Date#getDay() and the weekday column in the DB.
  const WEEKDAY_LABELS = [
    s.weekdaySun,
    s.weekdayMon,
    s.weekdayTue,
    s.weekdayWed,
    s.weekdayThu,
    s.weekdayFri,
    s.weekdaySat,
  ];

  // Windows and slots both come from the server on every render — every
  // mutation ends in router.refresh(), so there is no second copy to drift.
  const windows = initialWindows;
  const slots = initialSlots;

  const [tz, setTz] = useState(countryTimeZone);
  const [selectedDay, setSelectedDay] = useState<string>(() => todayKey(countryTimeZone));
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);

  // Window CRUD keeps its own busy/error state: it edits recurring rules, not
  // slots, so it is not part of the slot manager's state machine.
  const [windowBusy, setWindowBusy] = useState(false);
  const [windowError, setWindowError] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const deleteTarget = windows.find((w) => w.id === deleteTargetId) ?? null;
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const editTarget = windows.find((w) => w.id === editTargetId) ?? null;

  const [editWeekday, setEditWeekday] = useState(1);
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("17:00");
  const [editFromDate, setEditFromDate] = useState("");
  const [editUntilDate, setEditUntilDate] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  const tzOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const z of [countryTimeZone, ...availableTimezones, ...CURATED_TIME_ZONES]) {
      if (z && !seen.has(z)) {
        seen.add(z);
        out.push(z);
      }
    }
    return out;
  }, [countryTimeZone, availableTimezones]);

  // Restore the persisted display timezone after mount — the server always
  // renders the clinic zone, so a lazy initializer would hydrate mismatched.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TZ_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && tzOptions.includes(saved)) setTz(saved);
    } catch {
      /* ignore */
    }
  }, [tzOptions]);

  function onChangeTz(next: string) {
    setTz(next);
    try {
      window.localStorage.setItem(TZ_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  // ── Slot mutations ────────────────────────────────────────────────
  // Everything slot-shaped goes through the shared manager; this adapter is the
  // only doctor-specific part (its own endpoints, and a server refresh).
  const bulkLabels = {
    blocked: s.bulkBlocked,
    unblocked: s.bulkUnblocked,
    removed: s.bulkRemoved,
    skippedOccupied: s.bulkSkippedOccupied,
    skippedMissing: s.bulkSkippedMissing,
    nothingToDo: s.bulkNothingToDo,
  };
  const addNoticeLabels = {
    noticeAdded: c.noticeAdded,
    noticeSkippedOverlap: c.noticeSkippedOverlap,
    noticeSkippedPast: c.noticeSkippedPast,
  };
  const slotManager = useSlotManager({
    setStatus: (slotId, status) => toggleSlotStatus(slotId, status),
    remove: (slotId, reason) => removeSlotRequest(slotId, reason),
    create: (startAtIsos, durationMinutes) => createSlots(startAtIsos, durationMinutes),
    bulk: (input) => bulkSlotAction(input),
    onChanged: () => router.refresh(),
    describeAdd: (result) => describeAddResult(result, addNoticeLabels),
    describeBulk: (action, result) => describeBulkResult(action, result, bulkLabels),
  });

  const items = useMemo(
    () => [...consultations, ...slotsToItems(slots)],
    [consultations, slots],
  );
  const itemsByDay = useMemo(() => groupItemsByLocalDay(items, tz), [items, tz]);
  const dayItems = selectedDay ? itemsByDay.get(selectedDay) ?? [] : [];
  const weekDays = useMemo(() => weekDaysOf(weekAnchor), [weekAnchor]);

  // ── URL-driven view state ─────────────────────────────────────────
  function pushParams(next: { view?: CalendarView; ym?: string; wk?: string }) {
    const params = new URLSearchParams();
    const nextView = next.view ?? view;
    params.set("ym", next.ym ?? yearMonthParam(year, month));
    if (nextView === "month") params.set("view", "month");
    else params.set("wk", next.wk ?? weekAnchor);
    router.push(`${pathname}?${params.toString()}`);
    // Next caches the RSC payload per URL on the client. Without this, adding
    // availability and then switching view (or stepping a week) replays the
    // payload fetched BEFORE the mutation — the slots exist server-side but the
    // grid you land on is the stale one, which is exactly the "it showed in the
    // month but not the week" report.
    router.refresh();
  }

  // The month rides along with the week anchor so flipping back to Month lands
  // on the month just being read, not the one the doctor started from.
  function goToWeek(anchor: string) {
    pushParams({ view: "week", wk: anchor, ym: anchor.slice(0, 7) });
  }

  function openDay(key: string) {
    setSelectedDay(key);
    setDaySheetOpen(true);
  }

  function openEvent(item: CalendarItem) {
    // The detail drawer replaces the day sheet — no stacked overlays.
    setDaySheetOpen(false);
    setActiveItem(item);
  }

  // ── Availability windows ──────────────────────────────────────────
  async function onAddWeekly(input: {
    weekdays: number[];
    startMinute: number;
    endMinute: number;
    effectiveFrom: string;
    effectiveUntil: string;
  }) {
    setWindowError(null);
    slotManager.setError(null);
    setWindowBusy(true);
    // One window per weekday: the model is per-weekday, so "Mon, Wed, Fri" is
    // three rows the doctor can later pause or edit independently.
    for (const weekday of input.weekdays) {
      const res = await createAvailabilityWindow({
        weekday,
        startMinute: input.startMinute,
        endMinute: input.endMinute,
        slotDurationMinutes: BASE_SLOT_MINUTES,
        effectiveFrom: input.effectiveFrom
          ? new Date(`${input.effectiveFrom}T00:00:00.000Z`).toISOString()
          : undefined,
        effectiveUntil: input.effectiveUntil
          ? new Date(`${input.effectiveUntil}T23:59:59.999Z`).toISOString()
          : undefined,
      });
      if (!res.ok) {
        setWindowBusy(false);
        slotManager.setError(res.message);
        return;
      }
    }
    setWindowBusy(false);
    slotManager.setAddOpen(false);
    slotManager.setNotice(
      s.addedWeeklyNotice.split("{count}").join(String(input.weekdays.length)),
    );
    router.refresh();
  }

  /** Non-blocking heads-up while the add dialog is open: does this proposal sit
   *  on top of a window that already exists? Legitimate overlaps do happen
   *  (a temporary extra evening clinic), so it warns rather than blocks. */
  function describeConflict(
    weekdays: number[],
    startMinute: number,
    endMinute: number,
    from: string,
    until: string,
  ): string | null {
    const clash = windows.find(
      (w) =>
        w.isActive &&
        weekdays.includes(w.weekday) &&
        startMinute < w.endMinute &&
        endMinute > w.startMinute &&
        dateRangesOverlap(w.effectiveFrom, w.effectiveUntil, from, until),
    );
    if (!clash) return null;
    return s.overlapWarning
      .replace("{day}", WEEKDAY_LABELS[clash.weekday] ?? "—")
      .replace("{start}", minutesToTime(clash.startMinute))
      .replace("{end}", minutesToTime(clash.endMinute));
  }

  function onEditWindow(w: AvailabilityWindow) {
    setEditError(null);
    setEditWeekday(w.weekday);
    // <input type="time"> can't hold "24:00", so an end-of-day window seeds the
    // field as "00:00" — endTimeToMinutes maps it back on save.
    setEditStartTime(minutesToTimeInput(w.startMinute));
    setEditEndTime(minutesToTimeInput(w.endMinute));
    setEditFromDate(isoToDateInput(w.effectiveFrom));
    setEditUntilDate(isoToDateInput(w.effectiveUntil));
    setEditActive(w.isActive);
    setEditTargetId(w.id);
  }

  async function onSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = editTargetId;
    if (!id) return;
    setEditError(null);
    const startMin = timeToMinutes(editStartTime);
    const endMin = endTimeToMinutes(editEndTime);
    if (endMin <= startMin) {
      setEditError(s.errorEndAfterStart);
      return;
    }
    if (editFromDate && editUntilDate && editFromDate > editUntilDate) {
      setEditError(s.errorEndDateAfterStart);
      return;
    }
    setWindowBusy(true);
    const res = await updateAvailabilityWindow(id, {
      weekday: editWeekday,
      startMinute: startMin,
      endMinute: endMin,
      // Normalises any legacy window that still carries another grid step.
      slotDurationMinutes: BASE_SLOT_MINUTES,
      // null (not undefined) so clearing a date really clears the boundary.
      effectiveFrom: editFromDate
        ? new Date(`${editFromDate}T00:00:00.000Z`).toISOString()
        : null,
      effectiveUntil: editUntilDate
        ? new Date(`${editUntilDate}T23:59:59.999Z`).toISOString()
        : null,
      isActive: editActive,
    });
    setWindowBusy(false);
    if (!res.ok) {
      setEditError(res.message);
      return;
    }
    setEditTargetId(null);
    router.refresh();
  }

  async function confirmDeleteWindow() {
    const id = deleteTargetId;
    if (!id) return;
    setDeleteTargetId(null);
    setWindowBusy(true);
    const res = await deleteAvailabilityWindow(id);
    setWindowBusy(false);
    if (!res.ok) {
      setWindowError(res.message);
      return;
    }
    router.refresh();
  }

  const slotCounts = useMemo(
    () =>
      slots.reduce(
        (acc, slot) => {
          acc.total += 1;
          if (slot.status === "OPEN") acc.open += 1;
          if (slot.status === "BLOCKED") acc.blocked += 1;
          if (slot.status === "BOOKED") acc.booked += 1;
          return acc;
        },
        { total: 0, open: 0, blocked: 0, booked: 0 },
      ),
    [slots],
  );

  // Near-duplicate windows on the same weekday are indistinguishable at a
  // glance, so identity lives in structure: group by weekday, sort by start date.
  const windowGroups = useMemo(() => {
    const sorted = [...windows].sort((a, b) => {
      if (a.weekday !== b.weekday) return a.weekday - b.weekday;
      return (a.effectiveFrom ?? "").localeCompare(b.effectiveFrom ?? "");
    });
    const groups: { weekday: number; items: AvailabilityWindow[] }[] = [];
    for (const w of sorted) {
      const last = groups[groups.length - 1];
      if (last && last.weekday === w.weekday) last.items.push(w);
      else groups.push({ weekday: w.weekday, items: [w] });
    }
    return groups;
  }, [windows]);

  const busy = windowBusy || slotManager.busy;
  const error = windowError ?? slotManager.error;

  const weekLabels = {
    today: s.weekToday,
    prevWeekAria: s.weekPrevAria,
    nextWeekAria: s.weekNextAria,
    clickToBlock: s.weekClickToBlock,
    clickToReopen: s.weekClickToReopen,
    bookThisTime: s.weekBookThisTime,
    legendOpen: s.weekLegendOpen,
    legendBooked: s.weekLegendBooked,
    legendBlocked: s.weekLegendBlocked,
    removeThisSlot: c.removeSlotTitle,
    blockThisTime: s.slotActionBlock,
    selectSlot: s.selectSlot,
    deselectSlot: s.deselectSlot,
  };

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {slotManager.notice ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {slotManager.notice}
        </div>
      ) : null}

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: s.weeklyWindows,
            value: windows.length,
            hint: s.recurringScheduleRules,
            tone: windows.length > 0 ? "brand" : "warning",
            icon: <CalendarClock aria-hidden />,
          },
          {
            label: s.openSlots,
            value: slotCounts.open,
            hint: s.slotsGenerated.replace("{count}", String(slotCounts.total)),
            tone: slotCounts.open > 0 ? "success" : "neutral",
            icon: <CheckCircle2 aria-hidden />,
          },
          {
            label: s.booked,
            value: slotCounts.booked,
            hint: s.patientClaimed,
            tone: slotCounts.booked > 0 ? "brand" : "neutral",
            icon: <UserRound aria-hidden />,
          },
          {
            label: s.blocked,
            value: slotCounts.blocked,
            hint: s.markedUnavailable,
            tone: slotCounts.blocked > 0 ? "warning" : "neutral",
            icon: <Ban aria-hidden />,
          },
        ]}
      />

      {/* Toolbar — view, selection, adding, timezone. */}
      <div className="gh-doctor-calendar-toolbar mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle
            view={view}
            onChange={(next) =>
              next === "week"
                ? goToWeek(selectedDay || todayKey(tz))
                : pushParams({ view: "month" })
            }
            labels={{ month: s.viewMonth, week: s.viewWeek }}
            ariaLabel={s.viewToggleAria}
          />
          <Btn
            type="button"
            size="sm"
            variant={slotManager.selectionMode ? "primary" : "ghost"}
            onClick={() => slotManager.setSelectionMode(!slotManager.selectionMode)}
            iconLeft={<CheckSquare className="size-3.5" />}
          >
            {slotManager.selectionMode ? s.selectModeOn : s.selectMode}
          </Btn>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn
            type="button"
            size="sm"
            variant="primary"
            disabled={busy}
            onClick={() => {
              slotManager.clearMessages();
              setWindowError(null);
              slotManager.setAddOpen(true);
            }}
            iconLeft={<Plus className="size-3.5" />}
            data-tour="availability-add"
          >
            {s.addAvailabilityButton}
          </Btn>
          <TimezoneSelect value={tz} options={tzOptions} onChange={onChangeTz} />
        </div>
      </div>

      <div className="gh-doctor-detail-grid gh-doctor-availability-grid grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-3" data-tour="availability-week">
          {view === "week" ? (
            <WeekCalendar
              anchorDayKey={weekAnchor}
              weekDays={weekDays}
              itemsByDay={itemsByDay}
              tz={tz}
              todayKey={todayKey(tz)}
              // A doctor never books their own slot, so clicking an open one
              // blocks it. The corner buttons carry block and remove, and a
              // blocked block clicks back open — same set as the admin grid.
              onSelectOpenSlot={(item) => void slotManager.setStatus(item, "BLOCKED")}
              onSelectConsultation={openEvent}
              onBlockSlot={(item) => void slotManager.setStatus(item, "BLOCKED")}
              onSelectBlockedSlot={(item) => void slotManager.setStatus(item, "OPEN")}
              onRemoveSlot={(item) => slotManager.setRemoveTarget(item)}
              selectionMode={slotManager.selectionMode}
              selectedIds={slotManager.selected}
              onToggleSelect={slotManager.toggleSelected}
              slotActionsBusy={busy}
              onPrevWeek={() => goToWeek(addWeeksKey(weekAnchor, -1))}
              onNextWeek={() => goToWeek(addWeeksKey(weekAnchor, 1))}
              onToday={() => goToWeek(todayKey(tz))}
              labels={weekLabels}
            />
          ) : (
            <MonthCalendar
              year={year}
              month={month}
              itemsByDay={itemsByDay}
              selectedDay={selectedDay}
              todayKey={todayKey(tz)}
              onSelectDay={openDay}
              onPrevMonth={() => {
                const prev = addMonths(year, month, -1);
                pushParams({ ym: yearMonthParam(prev.year, prev.month) });
              }}
              onNextMonth={() => {
                const next = addMonths(year, month, 1);
                pushParams({ ym: yearMonthParam(next.year, next.month) });
              }}
              onToday={() => {
                const now = new Date();
                pushParams({ ym: yearMonthParam(now.getFullYear(), now.getMonth() + 1) });
                setSelectedDay(todayKey(tz));
              }}
            />
          )}

          <SelectionActionBar
            count={slotManager.selected.size}
            busy={busy}
            labels={{
              count: s.selectionCount,
              block: s.slotActionBlock,
              unblock: s.slotActionReopen,
              remove: s.slotActionRemove,
              clear: s.selectionClear,
              hint: s.selectionHint,
            }}
            onAction={(action) => void slotManager.bulkSelected(action)}
            onClear={slotManager.clearSelection}
          />
        </div>

        {/* ── Sidebar: recurring rules, then bulk slot controls ───────── */}
        <aside className="gh-doctor-side-stack grid gap-4 self-start">
          <AdminCard padding={0} className="gh-doctor-panel">
            <SectionHeader title={s.weeklyWindows} description={s.weeklyWindowsDesc} />
            <div className="p-5">
              {windows.length === 0 ? (
                <AdminEmptyState
                  className="gh-doctor-empty-state"
                  icon={<CalendarClock className="size-5" aria-hidden />}
                  title={s.noWindowsTitle}
                  description={s.noWindowsDesc}
                />
              ) : (
                <ul className="gh-doctor-window-list grid gap-2" data-tour="availability-windows" id="gh-availability-windows">
                  {windowGroups.map((group) => {
                    const hasDuplicates = group.items.length > 1;
                    return (
                      <li key={group.weekday} className="grid gap-2">
                        {hasDuplicates ? (
                          <p className="text-portal-micro font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
                            {WEEKDAY_LABELS[group.weekday] ?? "—"}
                          </p>
                        ) : null}
                        <ul className="grid gap-2">
                          {group.items.map((w) => (
                            <li
                              key={w.id}
                              className="gh-doctor-window-row flex items-center justify-between gap-3 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] px-3 py-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-[var(--portal-text)]">
                                  {!hasDuplicates
                                    ? `${WEEKDAY_LABELS[w.weekday] ?? "—"} · `
                                    : ""}
                                  {minutesToTime(w.startMinute)}–{minutesToTime(w.endMinute)}
                                </p>
                                <p className="text-portal-thead text-[var(--portal-muted)]">
                                  {s.baseGrid.replace("{duration}", String(w.slotDurationMinutes))}
                                  {!w.isActive ? s.paused : ""}
                                </p>
                                {w.effectiveFrom || w.effectiveUntil ? (
                                  <p
                                    className={
                                      hasDuplicates
                                        ? "text-sm font-medium text-[var(--portal-text)]"
                                        : "text-portal-micro text-[var(--portal-muted)]"
                                    }
                                  >
                                    {w.effectiveFrom
                                      ? s.fromDate.replace(
                                          "{date}",
                                          new Date(w.effectiveFrom).toLocaleDateString("en-IE"),
                                        )
                                      : s.fromAlways}{" "}
                                    ·{" "}
                                    {w.effectiveUntil
                                      ? s.untilDate.replace(
                                          "{date}",
                                          new Date(w.effectiveUntil).toLocaleDateString("en-IE"),
                                        )
                                      : s.forever}
                                  </p>
                                ) : hasDuplicates ? (
                                  <p className="text-sm font-medium text-[var(--portal-text)]">
                                    {s.fromAlways} · {s.forever}
                                  </p>
                                ) : null}
                              </div>
                              <div className="gh-doctor-window-actions flex items-center gap-2">
                                <Pill tone={w.isActive ? "active" : "neutral"}>
                                  {w.isActive ? s.active : s.pausedPill}
                                </Pill>
                                <button
                                  type="button"
                                  onClick={() => onEditWindow(w)}
                                  disabled={busy}
                                  aria-label={s.editWindow}
                                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-[var(--portal-muted)] hover:text-[var(--portal-text)] disabled:opacity-60"
                                >
                                  <Pencil className="size-3.5" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTargetId(w.id)}
                                  disabled={busy}
                                  aria-label={s.deleteWindow}
                                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                                >
                                  <Trash2 className="size-3.5" aria-hidden />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </AdminCard>

          <AdminCard padding={0} className="gh-doctor-panel">
            <SectionHeader title={s.legend} />
            <ul className="grid gap-2 p-5 text-portal-meta">
              <Legend tone="open" label={s.legendOpen} />
              <Legend tone="blocked" label={s.legendBlocked} />
              <Legend tone="booked" label={s.legendBooked} />
              <Legend tone="held" label={s.legendHeld} />
            </ul>
            <p className="px-5 pb-5 text-portal-thead text-[var(--portal-muted)]">
              {s.timesShownIn.replace("{tz}", tz)}
            </p>
          </AdminCard>
        </aside>
      </div>

      {/* Day agenda — month view's way into a single day. */}
      <AppSheet
        open={daySheetOpen}
        onOpenChange={setDaySheetOpen}
        size="md"
        theme="portal"
        header={
          <div className="gh-record-drawer__title-block">
            <span className="gh-record-drawer__eyebrow">{s.dayAgendaEyebrow}</span>
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
          emptyLabel={s.noItemsOnDay}
          consultationsLabel={s.sectionConsultations}
          slotsLabel={s.sectionSlots}
          onSelectConsultation={openEvent}
          canToggleSlot={() => false}
          selectionMode={slotManager.selectionMode}
          selectedIds={slotManager.selected}
          onToggleSelect={slotManager.toggleSelected}
          slotActionsBusy={busy}
          renderSlotAction={(item) => {
            if (item.status !== "OPEN" && item.status !== "BLOCKED") return null;
            const actionClass =
              "ml-0.5 rounded-full border border-current px-1.5 text-portal-micro font-bold uppercase tracking-wide hover:opacity-80 disabled:opacity-50";
            return (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void slotManager.setStatus(
                      item,
                      item.status === "OPEN" ? "BLOCKED" : "OPEN",
                    )
                  }
                  className={actionClass}
                >
                  {item.status === "OPEN" ? s.slotActionBlock : s.slotActionReopen}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDaySheetOpen(false);
                    slotManager.setRemoveTarget(item);
                  }}
                  className={actionClass}
                >
                  {s.slotActionRemove}
                </button>
              </>
            );
          }}
        />
      </AppSheet>

      <AddAvailabilityDialog
        key={slotManager.addOpen ? `add-${weekAnchor}` : "no-add"}
        open={slotManager.addOpen}
        tz={tz}
        defaultDate={weekAnchor}
        weekdayLabels={WEEKDAY_LABELS}
        busy={busy}
        error={slotManager.error}
        describeConflict={describeConflict}
        labels={{
          title: s.addAvailabilityButton,
          modeWeekly: s.addModeWeekly,
          modeDates: s.addModeDates,
          weeklyIntro: s.addWeeklyIntro,
          datesIntro: s.addDatesIntro,
          days: s.addDays,
          fromTime: s.manageFromTime,
          toTime: s.manageToTime,
          fromDate: s.manageFromDate,
          toDate: s.manageToDate,
          startsOptional: s.startsOptional,
          endsOptional: s.endsOptional,
          datesHint: s.datesHint,
          gridHint: s.baseSlotHint,
          timezoneHint: s.timesShownIn,
          cancel: s.cancel,
          confirmWeekly: s.addConfirmWeekly,
          confirmDates: s.addConfirmDates,
          busy: s.adding,
          errorPickDay: s.addErrorPickDay,
          errorEndAfterStart: s.errorEndAfterStart,
          errorEndDateAfterStart: s.errorEndDateAfterStart,
          errorTimeFormat: s.manageErrorTimeFormat,
          errorTooMany: s.manageErrorTooMany,
        }}
        onClose={() => {
          slotManager.setAddOpen(false);
          slotManager.setError(null);
        }}
        onSubmitWeekly={(input) => void onAddWeekly(input)}
        onSubmitDates={(isos, duration) => void slotManager.create(isos, duration)}
      />

      <RemoveSlotDialog
        key={slotManager.removeTarget?.id ?? "no-remove"}
        open={slotManager.removeTarget !== null}
        slot={slotManager.removeTarget}
        tz={tz}
        busy={busy}
        error={slotManager.error}
        labels={{
          title: c.removeSlotTitle,
          blockedSuffix: c.removeSlotBlockedSuffix,
          intro: c.removeSlotIntro,
          warning: c.removeSlotWarning,
          reasonLabel: s.reasonOptional,
          reasonPlaceholder: c.removeSlotReasonPlaceholder,
          reasonHint: c.removeSlotReasonHint,
          cancel: c.slotDialogCancel,
          confirm: c.removeSlotConfirm,
          confirmBusy: c.removeSlotBusy,
        }}
        onClose={() => {
          slotManager.setRemoveTarget(null);
          slotManager.setError(null);
        }}
        onConfirm={(reason) => {
          const target = slotManager.removeTarget;
          if (target) void slotManager.remove(target, reason || undefined);
        }}
      />

      <PortalDialog
        open={editTarget !== null}
        onClose={() => setEditTargetId(null)}
        title={
          editTarget
            ? s.editWindowTitleNamed
                .replace("{day}", WEEKDAY_LABELS[editTarget.weekday] ?? "—")
                .replace("{start}", minutesToTime(editTarget.startMinute))
                .replace("{end}", minutesToTime(editTarget.endMinute))
            : s.editWindowTitle
        }
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEditTargetId(null)} disabled={busy}>
              {s.cancel}
            </Btn>
            <Btn type="submit" form={EDIT_FORM_ID} variant="primary" disabled={busy}>
              {busy ? s.savingWindow : s.saveWindow}
            </Btn>
          </>
        }
      >
        <form id={EDIT_FORM_ID} onSubmit={onSaveEdit} className="grid gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="gh-field-label">{s.day}</span>
            <select
              className="gh-select"
              value={editWeekday}
              onChange={(e) => setEditWeekday(Number(e.target.value))}
            >
              {WEEKDAY_LABELS.map((label, value) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="gh-field-label">{common.from}</span>
              <input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="gh-field-label">{common.to}</span>
              <input
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="gh-input"
              />
            </label>
          </div>
          <p className="text-portal-meta text-[var(--portal-muted)]">
            {s.baseGrid.replace("{duration}", String(BASE_SLOT_MINUTES))} · {s.baseSlotHint}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="gh-field-label">{s.startsOptional}</span>
              <input
                type="date"
                value={editFromDate}
                onChange={(e) => setEditFromDate(e.target.value)}
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="gh-field-label">{s.endsOptional}</span>
              <input
                type="date"
                value={editUntilDate}
                onChange={(e) => setEditUntilDate(e.target.value)}
                className="gh-input"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editActive}
              onChange={(e) => setEditActive(e.target.checked)}
              className="size-4"
            />
            <span className="gh-field-label">{s.windowActive}</span>
          </label>
          <p className="text-portal-thead text-[var(--portal-muted)]">{s.windowActiveHint}</p>
          {editError ? <p className="text-sm text-rose-700">{editError}</p> : null}
          <p className="text-portal-thead text-[var(--portal-muted)]">{s.editWindowSlotsNote}</p>
        </form>

        {/* Managing the slots this window produced belongs here, not in a
            separate panel: the weekday and the hours are already established
            by the window being edited, so all that's left to choose is which
            dates and which action. */}
        {editTarget ? (
          <WindowSlotControls
            key={editTarget.id}
            tz={tz}
            weekday={editTarget.weekday}
            startTime={minutesToTimeInput(editTarget.startMinute)}
            endTime={minutesToTimeInput(editTarget.endMinute)}
            effectiveUntil={editTarget.effectiveUntil}
            busy={busy}
            labels={{
              title: s.manageSlotsTitle,
              hint: s.windowSlotsHint,
              reason: s.reasonOptional,
              reasonPlaceholder: s.manageReasonPlaceholder,
              block: s.slotActionBlock,
              unblock: s.slotActionReopen,
              remove: s.slotActionRemove,
              busy: s.manageBusy,
              affects: s.manageAffects,
              removeConfirm: s.manageRemoveConfirm,
              errorRange: s.manageErrorNoMatchingDays,
            }}
            onSubmit={(action, spans, reason) => {
              void slotManager.bulkBySpans(action, spans, reason || undefined);
            }}
          />
        ) : null}
      </PortalDialog>

      <PortalDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTargetId(null)}
        title={
          deleteTarget
            ? s.removeWindowTitleNamed
                .replace("{day}", WEEKDAY_LABELS[deleteTarget.weekday] ?? "—")
                .replace("{start}", minutesToTime(deleteTarget.startMinute))
                .replace("{end}", minutesToTime(deleteTarget.endMinute))
            : s.removeWindowTitle
        }
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDeleteTargetId(null)}>
              {s.cancel}
            </Btn>
            <Btn variant="danger" onClick={() => void confirmDeleteWindow()}>
              {s.remove}
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          {deleteTarget?.effectiveFrom || deleteTarget?.effectiveUntil
            ? s.removeWindowDateQualifier
                .replace(
                  "{from}",
                  deleteTarget.effectiveFrom
                    ? new Date(deleteTarget.effectiveFrom).toLocaleDateString("en-IE")
                    : s.fromAlways,
                )
                .replace(
                  "{until}",
                  deleteTarget.effectiveUntil
                    ? new Date(deleteTarget.effectiveUntil).toLocaleDateString("en-IE")
                    : s.forever,
                ) + " "
            : ""}
          {s.removeWindowBody}
        </p>
      </PortalDialog>

      <EventDetailDialog
        item={activeItem}
        tz={tz}
        onClose={() => setActiveItem(null)}
        viewerRole="doctor"
        labels={{
          consultation: c.eventDetailConsultation,
          close: c.eventDetailClose,
          appointment: c.eventDetailAppointment,
          type: c.eventDetailType,
          doctor: c.eventDetailDoctor,
          patient: c.eventDetailPatient,
          country: c.eventDetailCountry,
          order: c.eventDetailOrder,
          timing: c.eventDetailTiming,
          start: c.eventDetailStart,
          end: c.eventDetailEnd,
          timezone: c.eventDetailTimezone,
          links: c.eventDetailLinks,
          joinVideoCall: c.eventDetailJoinVideoCall,
          unconfirmed: c.eventDetailUnconfirmed,
          cancelled: c.eventDetailCancelled,
          ended: c.eventDetailEnded,
          opensAt: c.eventDetailOpensAt,
          joinPending: c.eventDetailJoinPending,
        }}
      />
    </>
  );
}

/**
 * Slot controls for one weekly window, rendered inside its edit dialog.
 *
 * The window already fixes the weekday and the hours, so this only asks for the
 * dates (blank = the stretch on screen) and the action. It expands to UTC
 * day-spans exactly like the bulk endpoints expect, filtered to this window's
 * weekday, and hands them up — booked slots are skipped server-side.
 */
/**
 * Slot controls for one weekly window, rendered inside its edit dialog.
 *
 * No date pickers: the window already says which day and which hours, so the
 * only sensible target is "the slots this window still has ahead of it". The
 * horizon runs from now to the window's end date, or 120 days out when it runs
 * forever — the same bound the availability API uses for a single read.
 * Booked and held slots are skipped server-side.
 */
function WindowSlotControls({
  tz,
  weekday,
  startTime,
  endTime,
  effectiveUntil,
  busy,
  labels: t,
  onSubmit,
}: {
  tz: string;
  weekday: number;
  startTime: string;
  endTime: string;
  /** ISO date the window stops applying, if it has one. */
  effectiveUntil: string | null;
  busy: boolean;
  labels: {
    title: string;
    hint: string;
    reason: string;
    reasonPlaceholder: string;
    block: string;
    unblock: string;
    remove: string;
    busy: string;
    affects: string;
    removeConfirm: string;
    errorRange: string;
  };
  onSubmit: (
    action: BulkSlotAction,
    spans: { fromUtc: string; toUtc: string }[],
    reason: string,
  ) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Today in the display timezone, so "future" means the doctor's future.
  const from = todayKey(tz);
  const horizon = addDaysKey(from, 120);
  const until = effectiveUntil ? effectiveUntil.slice(0, 10) : horizon;
  const to = until < horizon ? until : horizon;

  const affected = countRangeSlots(from, to, startTime, endTime, [weekday]);

  function submit(action: BulkSlotAction) {
    const { spans, problem } = expandDaySpans(from, to, startTime, endTime, tz, [
      weekday,
    ]);
    if (problem || spans.length === 0) {
      setError(t.errorRange);
      return;
    }
    if (action === "REMOVE" && !window.confirm(t.removeConfirm)) return;
    setError(null);
    onSubmit(action, spans, reason.trim());
  }

  return (
    <div
      className="mt-4 grid gap-3 border-t pt-4"
      style={{ borderColor: "var(--portal-line)" }}
    >
      <div>
        <p className="text-sm font-bold text-[var(--portal-text)]">{t.title}</p>
        <p className="text-portal-thead text-[var(--portal-muted)]">{t.hint}</p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="gh-field-label">{t.reason}</span>
        <input
          type="text"
          className="gh-input h-10"
          maxLength={200}
          placeholder={t.reasonPlaceholder}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>

      <p className="text-portal-meta text-[var(--portal-muted)]">
        {t.affects.split("{count}").join(String(affected))}
      </p>

      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("BLOCK")}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-portal-compact font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--portal-line-strong)", color: "var(--portal-text)" }}
        >
          <Ban className="size-3.5" aria-hidden /> {busy ? t.busy : t.block}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("UNBLOCK")}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-portal-compact font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--portal-line-strong)", color: "var(--portal-text)" }}
        >
          <Unlock className="size-3.5" aria-hidden /> {t.unblock}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("REMOVE")}
          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-portal-compact font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--portal-danger)", color: "var(--portal-danger)" }}
        >
          <Trash2 className="size-3.5" aria-hidden /> {t.remove}
        </button>
      </div>
    </div>
  );
}

function Legend({
  tone,
  label,
}: {
  tone: "open" | "blocked" | "booked" | "held";
  label: string;
}) {
  const cls =
    tone === "open"
      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
      : tone === "blocked"
        ? "bg-slate-100 border-slate-300 text-slate-700"
        : tone === "booked"
          ? "bg-blue-50 border-blue-200 text-blue-800"
          : "bg-amber-50 border-amber-200 text-amber-800";
  return (
    <li className="flex items-center gap-2">
      <span className={`inline-block size-3 rounded-full border ${cls}`} />
      {label}
    </li>
  );
}

export { CalendarClock };

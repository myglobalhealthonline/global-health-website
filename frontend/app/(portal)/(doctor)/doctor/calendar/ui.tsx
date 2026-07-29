"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarOff, CalendarPlus, Info, Lock, Plus, Unlock } from "lucide-react";
import { Btn } from "@/components/portal-atoms";
import { AppMenu } from "@/components/AppMenu";
import { FormSection } from "@/components/FormSection";
import {
  bulkBlockSlots,
  createAvailabilityWindow,
  fetchAvailabilityRangeClient,
  toggleSlotStatus,
} from "@/lib/api/doctor-availability-client";
import type { DoctorTimeSlotView } from "@/lib/api/doctor-availability-types";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { EventDetailDialog } from "@/components/calendar/EventDetailDialog";
import { TimezoneSelect } from "@/components/calendar/TimezoneSelect";
import { AppSheet } from "@/components/AppSheet";
import { BASE_SLOT_MINUTES } from "@/lib/constants";
import { endTimeToMinutes, timeToMinutes } from "@/lib/time-of-day";
import { CURATED_TIME_ZONES } from "@/lib/timezones";
import {
  addMonths,
  dayLabel,
  groupItemsByLocalDay,
  monthGridRangeIso,
  todayKey,
  zonedLocalDateTimeToUtc,
} from "@/components/calendar/calendar-utils";

const TZ_STORAGE_KEY = "gh-doctor-cal-tz";

/** Distinct weekdays (0=Sun..6=Sat) that occur in [fromDate, toDate]. */
function weekdaysInRange(fromDate: string, toDate: string): number[] {
  const set = new Set<number>();
  const start = Date.parse(`${fromDate}T00:00:00Z`);
  const end = Date.parse(`${toDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return [];
  for (let t = start; t <= end; t += 86400000) {
    set.add(new Date(t).getUTCDay());
    if (set.size === 7) break;
  }
  return [...set];
}

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

type CalendarStrings = Record<string, string>;
type CommonStrings = Record<string, string>;

type Props = {
  initialYear: number;
  initialMonth: number;
  initialSlots: DoctorTimeSlotView[];
  consultations: CalendarItem[];
  clinicTimezone: string;
  availableTimezones: string[];
  strings: CalendarStrings;
  common: CommonStrings;
  errorEndAfterStart: string;
  errorEndDateAfterStart: string;
  /** Stat strip, rendered below the month grid (grid is the primary task
   *  surface and must be reachable without scrolling — see CAL-04-001). */
  statsSlot?: ReactNode;
};

export function DoctorCalendarUI({
  initialYear,
  initialMonth,
  initialSlots,
  consultations,
  clinicTimezone,
  availableTimezones,
  strings: s,
  common,
  errorEndAfterStart,
  errorEndDateAfterStart,
  statsSlot,
}: Props) {
  const [tz, setTz] = useState(clinicTimezone);
  // Default view = the doctor's operating-country clinic zone; switcher also
  // offers their other clinic countries plus the curated zone list so a
  // single-country doctor can still re-read their day in any zone.
  const tzOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const z of [clinicTimezone, ...availableTimezones, ...CURATED_TIME_ZONES]) {
      if (z && !seen.has(z)) {
        seen.add(z);
        out.push(z);
      }
    }
    return out;
  }, [clinicTimezone, availableTimezones]);
  const [ym, setYm] = useState({ year: initialYear, month: initialMonth });
  const [slots, setSlots] = useState<DoctorTimeSlotView[]>(initialSlots);
  const [selectedDay, setSelectedDay] = useState<string>(() => todayKey(clinicTimezone));
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Add-availability / time-off validation and submit errors render inline
  // next to their own form instead of the shared top-of-page banner, which
  // sits ~170px above these bottom-of-page forms with no scroll affordance
  // (CAL-04-002).
  const [addAvailError, setAddAvailError] = useState<string | null>(null);
  const [timeOffError, setTimeOffError] = useState<string | null>(null);

  function openDay(key: string) {
    setSelectedDay(key);
    setDaySheetOpen(true);
  }

  function openEvent(item: CalendarItem) {
    // Event dialog replaces the day sheet — no stacked overlays (matches
    // admin calendar composition).
    setDaySheetOpen(false);
    setActiveItem(item);
  }

  // Range time-off form (datetime-local — date + time)
  const [offFrom, setOffFrom] = useState("");
  const [offTo, setOffTo] = useState("");
  const [offReason, setOffReason] = useState("");

  // Add-availability form (date range + daily time window + slot length).
  // Authored in the clinic timezone, like all availability windows.
  const [addFromDate, setAddFromDate] = useState("");
  const [addToDate, setAddToDate] = useState("");
  const [addStart, setAddStart] = useState("09:00");
  const [addEnd, setAddEnd] = useState("17:00");

  // Restore persisted display timezone (must be one the doctor is allowed).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TZ_STORAGE_KEY);
      // Restore after mount (not a lazy initializer) to avoid an SSR/client
      // hydration mismatch — server always renders the clinic timezone.
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

  // Refetch slots when the month changes (skip the initial render — the
  // server already provided the first month's slots).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let cancelled = false;
    setBusy(true);
    const { fromIso, toIso } = monthGridRangeIso(ym.year, ym.month);
    fetchAvailabilityRangeClient(fromIso, toIso)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setSlots(res.data.slots);
        else setError(res.message);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ym]);

  async function refetchMonth() {
    const { fromIso, toIso } = monthGridRangeIso(ym.year, ym.month);
    const res = await fetchAvailabilityRangeClient(fromIso, toIso);
    if (res.ok) setSlots(res.data.slots);
    else setError(res.message);
  }

  const items = useMemo(
    () => [...consultations, ...slotsToItems(slots)],
    [consultations, slots],
  );
  const itemsByDay = useMemo(() => groupItemsByLocalDay(items, tz), [items, tz]);
  const dayItems = selectedDay ? itemsByDay.get(selectedDay) ?? [] : [];
  async function onToggleSlot(item: CalendarItem) {
    if (item.status !== "OPEN" && item.status !== "BLOCKED") return;
    const next = item.status === "OPEN" ? "BLOCKED" : "OPEN";
    setError(null);
    setBusy(true);
    const res = await toggleSlotStatus(item.id, next);
    if (res.ok) {
      setSlots((prev) =>
        prev.map((s) =>
          s.id === item.id
            ? { ...s, status: res.data.status as DoctorTimeSlotView["status"] }
            : s,
        ),
      );
    } else {
      setError(res.message);
    }
    setBusy(false);
  }

  async function onRangeTimeOff(action: "BLOCK" | "UNBLOCK") {
    if (!offFrom || !offTo) {
      setTimeOffError(s.errorPickStartEnd);
      return;
    }
    if (offFrom >= offTo) {
      setTimeOffError(s.errorEndMustBeAfterStart);
      return;
    }
    const fromUtc = zonedLocalDateTimeToUtc(offFrom, tz);
    const toUtc = zonedLocalDateTimeToUtc(offTo, tz);
    if (!fromUtc || !toUtc) {
      setTimeOffError(s.errorInvalidDateTime);
      return;
    }
    setTimeOffError(null);
    setBusy(true);
    const res = await bulkBlockSlots({
      fromUtc,
      toUtc,
      action,
      reason: action === "BLOCK" ? offReason.trim() || "Time off" : undefined,
    });
    if (res.ok) {
      await refetchMonth();
      setOffFrom("");
      setOffTo("");
      setOffReason("");
    } else {
      setTimeOffError(res.message);
    }
    setBusy(false);
  }

  // Add availability over a date range with a daily time window. Creates a
  // bounded recurring window per weekday in the range (effectiveFrom/Until =
  // the dates) so the public site generates bookable slots sized to whatever
  // each consultation type needs.
  async function onAddAvailability() {
    if (!addFromDate || !addToDate) {
      setAddAvailError(s.errorPickDates);
      return;
    }
    if (addFromDate > addToDate) {
      setAddAvailError(errorEndDateAfterStart);
      return;
    }
    const startMin = timeToMinutes(addStart);
    // "00:00" as an end time means midnight/end-of-day (1440), not minute 0 —
    // otherwise a 16:00 → midnight evening clinic fails the guard below.
    const endMin = endTimeToMinutes(addEnd);
    if (endMin <= startMin) {
      setAddAvailError(errorEndAfterStart);
      return;
    }
    const weekdays = weekdaysInRange(addFromDate, addToDate);
    if (weekdays.length === 0) {
      setAddAvailError(s.errorInvalidRange);
      return;
    }
    setAddAvailError(null);
    setBusy(true);
    const effectiveFrom = `${addFromDate}T00:00:00.000Z`;
    const effectiveUntil = `${addToDate}T23:59:59.999Z`;
    let failed: string | null = null;
    for (const weekday of weekdays) {
      const res = await createAvailabilityWindow({
        weekday,
        startMinute: startMin,
        endMinute: endMin,
        slotDurationMinutes: BASE_SLOT_MINUTES,
        effectiveFrom,
        effectiveUntil,
      });
      if (!res.ok) {
        failed = res.message;
        break;
      }
    }
    if (failed) setAddAvailError(failed);
    else {
      await refetchMonth();
      setAddFromDate("");
      setAddToDate("");
    }
    setBusy(false);
  }

  return (
    <div className="gh-doctor-calendar grid gap-4">
      {statsSlot}

      {/* Toolbar */}
      <div className="gh-doctor-calendar-toolbar flex flex-wrap items-center justify-between gap-3">
        {/* Legend was a permanent floating row (CAL-04-008) — now a toggled
            popover so it doesn't cost vertical space on every load. */}
        <AppMenu
          trigger={
            <button
              type="button"
              data-tour="calendar-legend"
              className="gh-doctor-calendar-legend-trigger inline-flex items-center gap-1.5 rounded-[999px] px-3 py-1.5 text-xs font-semibold transition hover:bg-[var(--portal-well)]"
              style={{ border: "1px solid var(--portal-line-strong)", color: "var(--portal-text)" }}
            >
              <Info className="size-3.5" aria-hidden />
              {s.legendToggle}
            </button>
          }
          align="start"
          contentClassName="gh-portal-menu-content min-w-[220px] p-3"
        >
          <div className="gh-doctor-calendar-legend flex flex-col gap-2 text-xs text-[var(--portal-muted)]">
            <LegendDot className="bg-emerald-500" label={s.legendOpen} />
            <LegendDot className="bg-rose-400" label={s.legendBlocked} />
            <LegendDot className="bg-blue-500" label={s.legendBooked} />
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-portal-micro font-bold text-emerald-800">
                N
              </span>
              {s.legendConsultations}
            </span>
          </div>
        </AppMenu>
        <TimezoneSelect value={tz} options={tzOptions} onChange={onChangeTz} />
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

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

      {/* Day agenda — lux sheet, same composition as the admin calendar's
          day drawer (RC7: doctor previously rendered this inline in a fixed
          sidebar, which clipped/overflowed at short viewport heights). */}
      <AppSheet
        open={daySheetOpen}
        onOpenChange={setDaySheetOpen}
        size="md"
        theme="portal"
        header={
          <div className="gh-record-drawer__title-block">
            <span className="gh-record-drawer__eyebrow">{s.dayAgendaEyebrow ?? "Day agenda"}</span>
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
          onSelectSlot={onToggleSlot}
          slotActionsBusy={busy}
          renderSlotAction={(item) => {
            if (item.status !== "OPEN" && item.status !== "BLOCKED") return null;
            // Indicator only — the chip itself is the button now.
            return item.status === "OPEN" ? (
              <Lock className="size-3" aria-hidden />
            ) : (
              <Unlock className="size-3" aria-hidden />
            );
          }}
        />
      </AppSheet>

      <div className="gh-doctor-calendar-forms grid gap-4 lg:grid-cols-2">
        {/* Add availability over a date + time range */}
        <FormSection
          title={
            <span className="flex items-center gap-2">
              <CalendarPlus className="size-4 text-[var(--portal-muted)]" aria-hidden />
              {s.addAvailabilityTitle}
            </span>
          }
          description={s.addAvailabilityDesc.replace("{tz}", clinicTimezone)}
          className="gh-doctor-calendar-form-card"
        >
          <div className="gh-form-section__span-2 grid gap-3" data-tour="calendar-add">
            <div className="gh-doctor-calendar-date-grid grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{s.fromDate}</span>
                <input
                  type="date"
                  value={addFromDate}
                  min={todayKey(clinicTimezone)}
                  onChange={(e) => setAddFromDate(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{s.toDate}</span>
                <input
                  type="date"
                  value={addToDate}
                  min={addFromDate || todayKey(clinicTimezone)}
                  onChange={(e) => setAddToDate(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
            </div>
            <div className="gh-doctor-calendar-time-grid grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{s.fromTime}</span>
                <input
                  type="time"
                  value={addStart}
                  onChange={(e) => setAddStart(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{s.toTime}</span>
                <input
                  type="time"
                  value={addEnd}
                  onChange={(e) => setAddEnd(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
            </div>
            {addAvailError ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {addAvailError}
              </p>
            ) : null}
            <Btn
              type="button"
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={onAddAvailability}
              iconLeft={<Plus className="size-3.5" />}
            >
              {s.saveAvailabilityButton}
            </Btn>
          </div>
        </FormSection>

        {/* Date + time range time off (vacation / leave) */}
        <FormSection
          title={
            <span className="flex items-center gap-2">
              <CalendarOff className="size-4 text-[var(--portal-muted)]" aria-hidden />
              {s.timeOffTitle}
            </span>
          }
          description={s.timeOffDesc.replace("{tz}", tz)}
          className="gh-doctor-calendar-form-card"
        >
          <div className="gh-form-section__span-2 grid gap-3" data-tour="calendar-timeoff">
            <div className="gh-doctor-calendar-date-grid grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{common.from}</span>
                <input
                  type="datetime-local"
                  value={offFrom}
                  onChange={(e) => setOffFrom(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{common.to}</span>
                <input
                  type="datetime-local"
                  value={offTo}
                  onChange={(e) => setOffTo(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="gh-field-label">{s.reasonOptional}</span>
              <input
                type="text"
                value={offReason}
                maxLength={200}
                placeholder={s.reasonPlaceholder}
                onChange={(e) => setOffReason(e.target.value)}
                className="gh-input h-10"
              />
            </label>
            {timeOffError ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {timeOffError}
              </p>
            ) : null}
            <div className="gh-doctor-calendar-range-actions flex gap-2">
              <Btn
                type="button"
                size="sm"
                variant="primary"
                disabled={busy}
                onClick={() => onRangeTimeOff("BLOCK")}
                iconLeft={<Lock className="size-3.5" />}
              >
                {s.blockRange}
              </Btn>
              <Btn
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onRangeTimeOff("UNBLOCK")}
                iconLeft={<Unlock className="size-3.5" />}
              >
                {s.reopen}
              </Btn>
            </div>
          </div>
        </FormSection>
      </div>

      <EventDetailDialog
        item={activeItem}
        tz={tz}
        onClose={() => setActiveItem(null)}
        viewerRole="doctor"
        labels={{
          consultation: s.eventDetailConsultation,
          close: s.eventDetailClose,
          appointment: s.eventDetailAppointment,
          type: s.eventDetailType,
          doctor: s.eventDetailDoctor,
          patient: s.eventDetailPatient,
          country: s.eventDetailCountry,
          order: s.eventDetailOrder,
          timing: s.eventDetailTiming,
          start: s.eventDetailStart,
          end: s.eventDetailEnd,
          timezone: s.eventDetailTimezone,
          links: s.eventDetailLinks,
          joinVideoCall: s.eventDetailJoinVideoCall,
          unconfirmed: s.eventDetailUnconfirmed,
          cancelled: s.eventDetailCancelled,
          ended: s.eventDetailEnded,
          opensAt: s.eventDetailOpensAt,
          joinPending: s.eventDetailJoinPending,
        }}
      />
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

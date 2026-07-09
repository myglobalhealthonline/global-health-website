"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarOff, CalendarPlus, Lock, Plus, Unlock } from "lucide-react";
import { Btn } from "@/components/portal-atoms";
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
import { CURATED_TIME_ZONES } from "@/lib/timezones";
import {
  addMonths,
  dayLabel,
  groupItemsByLocalDay,
  monthGridRangeIso,
  todayKey,
  zonedDayRangeUtc,
  zonedLocalDateTimeToUtc,
} from "@/components/calendar/calendar-utils";

const TZ_STORAGE_KEY = "gh-doctor-cal-tz";
const SLOT_DURATIONS = [15, 20, 30, 45, 60];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

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
  minutesShort: string;
  errorEndAfterStart: string;
  errorEndDateAfterStart: string;
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
  minutesShort,
  errorEndAfterStart,
  errorEndDateAfterStart,
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
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [addDuration, setAddDuration] = useState(15);

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
  const daySlotItems = dayItems.filter((i) => i.kind === "slot");
  const dayHasOpen = daySlotItems.some((i) => i.status === "OPEN");
  const dayHasBlocked = daySlotItems.some((i) => i.status === "BLOCKED");

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

  async function onBlockDay(action: "BLOCK" | "UNBLOCK") {
    if (!selectedDay) return;
    setError(null);
    setBusy(true);
    const { fromIso, toIso } = zonedDayRangeUtc(selectedDay, selectedDay, tz);
    const res = await bulkBlockSlots({
      fromUtc: fromIso,
      toUtc: toIso,
      action,
      reason: action === "BLOCK" ? "Time off" : undefined,
    });
    if (res.ok) await refetchMonth();
    else setError(res.message);
    setBusy(false);
  }

  async function onRangeTimeOff(action: "BLOCK" | "UNBLOCK") {
    if (!offFrom || !offTo) {
      setError(s.errorPickStartEnd);
      return;
    }
    if (offFrom >= offTo) {
      setError(s.errorEndMustBeAfterStart);
      return;
    }
    const fromUtc = zonedLocalDateTimeToUtc(offFrom, tz);
    const toUtc = zonedLocalDateTimeToUtc(offTo, tz);
    if (!fromUtc || !toUtc) {
      setError(s.errorInvalidDateTime);
      return;
    }
    setError(null);
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
      setError(res.message);
    }
    setBusy(false);
  }

  // Add availability over a date range with a daily time window. Creates a
  // bounded recurring window per weekday in the range (effectiveFrom/Until =
  // the dates) so the public site generates bookable slots sized to whatever
  // each consultation type needs.
  async function onAddAvailability() {
    if (!addFromDate || !addToDate) {
      setError(s.errorPickDates);
      return;
    }
    if (addFromDate > addToDate) {
      setError(errorEndDateAfterStart);
      return;
    }
    const startMin = timeToMinutes(addStart);
    const endMin = timeToMinutes(addEnd);
    if (endMin <= startMin) {
      setError(errorEndAfterStart);
      return;
    }
    const weekdays = weekdaysInRange(addFromDate, addToDate);
    if (weekdays.length === 0) {
      setError(s.errorInvalidRange);
      return;
    }
    setError(null);
    setBusy(true);
    const effectiveFrom = `${addFromDate}T00:00:00.000Z`;
    const effectiveUntil = `${addToDate}T23:59:59.999Z`;
    let failed: string | null = null;
    for (const weekday of weekdays) {
      const res = await createAvailabilityWindow({
        weekday,
        startMinute: startMin,
        endMinute: endMin,
        slotDurationMinutes: addDuration,
        effectiveFrom,
        effectiveUntil,
      });
      if (!res.ok) {
        failed = res.message;
        break;
      }
    }
    if (failed) setError(failed);
    else {
      await refetchMonth();
      setAddFromDate("");
      setAddToDate("");
    }
    setBusy(false);
  }

  return (
    <div className="gh-doctor-calendar grid gap-4">
      {/* Toolbar */}
      <div className="gh-doctor-calendar-toolbar flex flex-wrap items-center justify-between gap-3">
        <div className="gh-doctor-calendar-legend flex flex-wrap items-center gap-3 text-xs text-[var(--portal-muted)]">
          <LegendDot className="bg-emerald-500" label={s.legendOpen} />
          <LegendDot className="bg-rose-400" label={s.legendBlocked} />
          <LegendDot className="bg-blue-500" label={s.legendBooked} />
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
              N
            </span>
            {s.legendConsultations}
          </span>
        </div>
        <TimezoneSelect value={tz} options={tzOptions} onChange={onChangeTz} />
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="gh-doctor-calendar-main grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
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

        <div className="gh-doctor-calendar-side grid gap-4 self-start">
          {/* Day-level block controls */}
          {selectedDay ? (
            <div className="gh-doctor-calendar-day-card gh-card p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
                {dayLabel(selectedDay)}
              </p>
              <div className="gh-doctor-calendar-day-actions mt-3 flex flex-wrap gap-2">
                <Btn
                  type="button"
                  size="sm"
                  variant="soft"
                  disabled={busy || !dayHasOpen}
                  onClick={() => onBlockDay("BLOCK")}
                  iconLeft={<Lock className="size-3.5" />}
                >
                  {s.blockWholeDay}
                </Btn>
                <Btn
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || !dayHasBlocked}
                  onClick={() => onBlockDay("UNBLOCK")}
                  iconLeft={<Unlock className="size-3.5" />}
                >
                  {s.reopenDay}
                </Btn>
              </div>
            </div>
          ) : null}

          <DayAgenda
            dayKey={selectedDay}
            items={dayItems}
            tz={tz}
            emptyLabel={s.noItemsOnDay}
            onSelectConsultation={setActiveItem}
            renderSlotAction={(item) => {
              if (item.status !== "OPEN" && item.status !== "BLOCKED") return null;
              const isOpen = item.status === "OPEN";
              return (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onToggleSlot(item)}
                  title={isOpen ? s.blockSlotTitle : s.reopenSlotTitle}
                  className="ml-0.5 inline-flex items-center disabled:opacity-50"
                >
                  {isOpen ? (
                    <Lock className="size-3" aria-hidden />
                  ) : (
                    <Unlock className="size-3" aria-hidden />
                  )}
                </button>
              );
            }}
          />
        </div>
      </div>

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
          <div className="gh-form-section__span-2 grid gap-3">
            <div className="gh-doctor-calendar-date-grid grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{s.fromDate}</span>
                <input
                  type="date"
                  value={addFromDate}
                  onChange={(e) => setAddFromDate(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{s.toDate}</span>
                <input
                  type="date"
                  value={addToDate}
                  onChange={(e) => setAddToDate(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
            </div>
            <div className="gh-doctor-calendar-time-grid grid grid-cols-3 gap-2">
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
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{s.baseSlotLength}</span>
                <select
                  className="gh-select h-10"
                  value={addDuration}
                  onChange={(e) => setAddDuration(Number(e.target.value))}
                >
                  {SLOT_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {minutesShort.replace("{count}", String(d))}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Btn
              type="button"
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={onAddAvailability}
              iconLeft={<Plus className="size-3.5" />}
            >
              {s.addAvailabilityButton}
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
          <div className="gh-form-section__span-2 grid gap-3">
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

      <EventDetailDialog item={activeItem} tz={tz} onClose={() => setActiveItem(null)} />
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

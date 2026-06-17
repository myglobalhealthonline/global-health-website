"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarOff, CalendarPlus, Lock, Plus, Unlock } from "lucide-react";
import { Btn } from "@/components/portal-atoms";
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

type Props = {
  initialYear: number;
  initialMonth: number;
  initialSlots: DoctorTimeSlotView[];
  consultations: CalendarItem[];
  clinicTimezone: string;
  availableTimezones: string[];
};

export function DoctorCalendarUI({
  initialYear,
  initialMonth,
  initialSlots,
  consultations,
  clinicTimezone,
  availableTimezones,
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
  const [addDuration, setAddDuration] = useState(30);

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
      setError("Pick a start and end date/time for the time off.");
      return;
    }
    if (offFrom >= offTo) {
      setError("End must be after start.");
      return;
    }
    const fromUtc = zonedLocalDateTimeToUtc(offFrom, tz);
    const toUtc = zonedLocalDateTimeToUtc(offTo, tz);
    if (!fromUtc || !toUtc) {
      setError("Invalid date/time.");
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
      setError("Pick a start and end date.");
      return;
    }
    if (addFromDate > addToDate) {
      setError("End date must be on or after start date.");
      return;
    }
    const startMin = timeToMinutes(addStart);
    const endMin = timeToMinutes(addEnd);
    if (endMin <= startMin) {
      setError("End time must be after start time.");
      return;
    }
    const weekdays = weekdaysInRange(addFromDate, addToDate);
    if (weekdays.length === 0) {
      setError("Invalid date range.");
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
    <div className="grid gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <LegendDot className="bg-emerald-500" label="Open" />
          <LegendDot className="bg-rose-400" label="Blocked" />
          <LegendDot className="bg-blue-500" label="Booked" />
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
              N
            </span>
            Consultations
          </span>
        </div>
        <TimezoneSelect value={tz} options={tzOptions} onChange={onChangeTz} />
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

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

        <div className="grid gap-4 self-start">
          {/* Day-level block controls */}
          {selectedDay ? (
            <div className="gh-card p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                {dayLabel(selectedDay)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn
                  type="button"
                  size="sm"
                  variant="soft"
                  disabled={busy || !dayHasOpen}
                  onClick={() => onBlockDay("BLOCK")}
                  iconLeft={<Lock className="size-3.5" />}
                >
                  Block whole day
                </Btn>
                <Btn
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || !dayHasBlocked}
                  onClick={() => onBlockDay("UNBLOCK")}
                  iconLeft={<Unlock className="size-3.5" />}
                >
                  Re-open day
                </Btn>
              </div>
            </div>
          ) : null}

          <DayAgenda
            dayKey={selectedDay}
            items={dayItems}
            tz={tz}
            emptyLabel="No consultations or slots on this day."
            onSelectConsultation={setActiveItem}
            renderSlotAction={(item) => {
              if (item.status !== "OPEN" && item.status !== "BLOCKED") return null;
              const isOpen = item.status === "OPEN";
              return (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onToggleSlot(item)}
                  title={isOpen ? "Block this slot" : "Re-open this slot"}
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

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Add availability over a date + time range */}
        <div className="gh-card p-4">
          <div className="flex items-center gap-2">
            <CalendarPlus className="size-4 text-[var(--color-text-muted)]" aria-hidden />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Add availability
            </h3>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            You&apos;re available on these dates, during these hours. Slots are
            generated and shown on the website, sized to each consultation&apos;s
            length. Times in {clinicTimezone} (clinic time).
          </p>
          <div className="mt-3 grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">From date</span>
                <input
                  type="date"
                  value={addFromDate}
                  onChange={(e) => setAddFromDate(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">To date</span>
                <input
                  type="date"
                  value={addToDate}
                  onChange={(e) => setAddToDate(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">From time</span>
                <input
                  type="time"
                  value={addStart}
                  onChange={(e) => setAddStart(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">To time</span>
                <input
                  type="time"
                  value={addEnd}
                  onChange={(e) => setAddEnd(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">Slot length</span>
                <select
                  className="gh-select h-10"
                  value={addDuration}
                  onChange={(e) => setAddDuration(Number(e.target.value))}
                >
                  {SLOT_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
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
              Add availability
            </Btn>
          </div>
        </div>

        {/* Date + time range time off (vacation / leave) */}
        <div className="gh-card p-4">
          <div className="flex items-center gap-2">
            <CalendarOff className="size-4 text-[var(--color-text-muted)]" aria-hidden />
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Time off</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Block open slots across a date and time range — for holidays or
            leave. Booked appointments are never touched. Times in {tz}.
          </p>
          <div className="mt-3 grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">From</span>
                <input
                  type="datetime-local"
                  value={offFrom}
                  onChange={(e) => setOffFrom(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">To</span>
                <input
                  type="datetime-local"
                  value={offTo}
                  onChange={(e) => setOffTo(e.target.value)}
                  className="gh-input h-10"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="gh-field-label">Reason (optional)</span>
              <input
                type="text"
                value={offReason}
                maxLength={200}
                placeholder="Holiday"
                onChange={(e) => setOffReason(e.target.value)}
                className="gh-input h-10"
              />
            </label>
            <div className="flex gap-2">
              <Btn
                type="button"
                size="sm"
                variant="primary"
                disabled={busy}
                onClick={() => onRangeTimeOff("BLOCK")}
                iconLeft={<Lock className="size-3.5" />}
              >
                Block range
              </Btn>
              <Btn
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => onRangeTimeOff("UNBLOCK")}
                iconLeft={<Unlock className="size-3.5" />}
              >
                Re-open
              </Btn>
            </div>
          </div>
        </div>
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

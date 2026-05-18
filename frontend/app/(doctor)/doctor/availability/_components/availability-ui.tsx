"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Lock, Plus, Trash2, Unlock } from "lucide-react";
import {
  createAvailabilityWindow,
  deleteAvailabilityWindow,
  toggleSlotStatus,
} from "@/lib/api/doctor-availability-client";
import type {
  AvailabilityWindow,
  DoctorTimeSlotView,
} from "@/lib/api/doctor-availability-types";
import { AdminCard, Btn, Pill, SectionHeader } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const SLOT_DURATIONS = [15, 20, 30, 45, 60];

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function statusTone(status: DoctorTimeSlotView["status"]): PillTone {
  if (status === "BOOKED") return "active";
  if (status === "HELD") return "pending";
  if (status === "BLOCKED") return "inactive";
  return "published";
}

function statusLabel(status: DoctorTimeSlotView["status"]): string {
  if (status === "OPEN") return "Open";
  if (status === "BOOKED") return "Booked";
  if (status === "HELD") return "Held";
  return "Blocked";
}

type Props = {
  initialWindows: AvailabilityWindow[];
  initialSlots: DoctorTimeSlotView[];
};

export function DoctorAvailabilityUI({ initialWindows, initialSlots }: Props) {
  const router = useRouter();
  const [windows, setWindows] = useState(initialWindows);
  const [slots, setSlots] = useState(initialSlots);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ── Add-window form state ───────────────────────────────────────
  const [weekday, setWeekday] = useState(1); // Mon
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [duration, setDuration] = useState(30);
  // ISO date strings (YYYY-MM-DD). Empty = "always" / "forever".
  const [effectiveFromDate, setEffectiveFromDate] = useState("");
  const [effectiveUntilDate, setEffectiveUntilDate] = useState("");

  function onAddWindow(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) {
      setError("End time must be after start time");
      return;
    }
    if (
      effectiveFromDate &&
      effectiveUntilDate &&
      effectiveFromDate > effectiveUntilDate
    ) {
      setError("End date must be on or after start date");
      return;
    }
    startTransition(async () => {
      const res = await createAvailabilityWindow({
        weekday,
        startMinute: startMin,
        endMinute: endMin,
        slotDurationMinutes: duration,
        effectiveFrom: effectiveFromDate
          ? new Date(`${effectiveFromDate}T00:00:00.000Z`).toISOString()
          : undefined,
        effectiveUntil: effectiveUntilDate
          ? new Date(`${effectiveUntilDate}T23:59:59.999Z`).toISOString()
          : undefined,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setWindows((prev) => [...prev, res.data.availability]);
      setEffectiveFromDate("");
      setEffectiveUntilDate("");
      router.refresh();
    });
  }

  function onDeleteWindow(id: string) {
    if (!window.confirm("Remove this weekly window? Future open slots derived from it will be cleared.")) return;
    startTransition(async () => {
      const res = await deleteAvailabilityWindow(id);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setWindows((prev) => prev.filter((w) => w.id !== id));
      // Remove derived OPEN slots from local state
      setSlots((prev) => prev.filter((s) => s.status !== "OPEN"));
      router.refresh();
    });
  }

  function onToggleSlot(slot: DoctorTimeSlotView) {
    if (slot.status !== "OPEN" && slot.status !== "BLOCKED") return; // BOOKED/HELD not editable
    const next = slot.status === "OPEN" ? "BLOCKED" : "OPEN";
    startTransition(async () => {
      const res = await toggleSlotStatus(slot.id, next);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSlots((prev) =>
        prev.map((s) =>
          s.id === slot.id ? { ...s, status: res.data.status as DoctorTimeSlotView["status"] } : s,
        ),
      );
    });
  }

  // ── Group slots by local date ───────────────────────────────────
  const slotsByDay = useMemo(() => {
    const map = new Map<string, DoctorTimeSlotView[]>();
    for (const s of slots) {
      const date = new Date(s.startAt);
      const key = date.toLocaleDateString("en-IE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Europe/Dublin",
      });
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [slots]);

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* ── Concrete slots day grid ───────────────────────────── */}
        <AdminCard padding={0}>
          <SectionHeader
            title="Next 14 days"
            description="Click an open slot to mark yourself busy. Click a blocked slot to re-open it. Booked slots can't be changed here — cancel the appointment first."
          />
          <div className="p-5">
            {slotsByDay.size === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                No slots yet. Add a weekly window on the right to generate
                slots automatically.
              </p>
            ) : (
              <div className="grid gap-4">
                {Array.from(slotsByDay.entries()).map(([day, daySlots]) => (
                  <div key={day}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                      {day}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {daySlots.map((s) => {
                        const time = new Date(s.startAt).toLocaleTimeString(
                          "en-IE",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: "Europe/Dublin",
                          },
                        );
                        const interactive =
                          s.status === "OPEN" || s.status === "BLOCKED";
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={!interactive || busy}
                            onClick={() => onToggleSlot(s)}
                            title={
                              s.status === "OPEN"
                                ? "Click to mark busy"
                                : s.status === "BLOCKED"
                                  ? "Click to re-open"
                                  : "Locked by appointment"
                            }
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition disabled:cursor-not-allowed ${
                              s.status === "OPEN"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400"
                                : s.status === "BLOCKED"
                                  ? "border-rose-300 bg-rose-50 text-rose-700 hover:border-rose-500"
                                  : s.status === "BOOKED"
                                    ? "border-blue-200 bg-blue-50 text-blue-800 opacity-80"
                                    : "border-amber-200 bg-amber-50 text-amber-800 opacity-80"
                            }`}
                          >
                            {s.status === "BLOCKED" ? (
                              <Lock className="size-3" aria-hidden />
                            ) : s.status === "OPEN" ? (
                              <Unlock className="size-3" aria-hidden />
                            ) : null}
                            <span
                              className={
                                s.status === "BLOCKED" ? "line-through decoration-2" : ""
                              }
                            >
                              {time}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AdminCard>

        {/* ── Sidebar: windows list + add form ─────────────────── */}
        <aside className="grid gap-4 self-start">
          <AdminCard padding={0}>
            <SectionHeader
              title="Weekly windows"
              description="Recurring blocks the system uses to generate concrete slots."
            />
            <div className="p-5">
              {windows.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No windows yet. Add your first one below.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {windows.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {WEEKDAYS.find((d) => d.value === w.weekday)?.label ?? "—"}{" "}
                          · {minutesToTime(w.startMinute)}–
                          {minutesToTime(w.endMinute)}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)]">
                          {w.slotDurationMinutes}-min slots
                          {!w.isActive ? " · paused" : ""}
                        </p>
                        {w.effectiveFrom || w.effectiveUntil ? (
                          <p className="text-[10px] text-[var(--color-text-muted)]">
                            {w.effectiveFrom
                              ? `from ${new Date(w.effectiveFrom).toLocaleDateString("en-IE")}`
                              : "from always"}
                            {" "}·{" "}
                            {w.effectiveUntil
                              ? `until ${new Date(w.effectiveUntil).toLocaleDateString("en-IE")}`
                              : "forever"}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill tone={w.isActive ? "active" : "neutral"}>
                          {w.isActive ? "Active" : "Paused"}
                        </Pill>
                        <button
                          type="button"
                          onClick={() => onDeleteWindow(w.id)}
                          disabled={busy}
                          aria-label="Delete window"
                          className="rounded-md p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </AdminCard>

          <AdminCard padding={0}>
            <SectionHeader
              title="Add window"
              description="A weekly recurring time band."
            />
            <form onSubmit={onAddWindow} className="grid gap-3 p-5">
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">Day</span>
                <select
                  className="gh-select"
                  value={weekday}
                  onChange={(e) => setWeekday(Number(e.target.value))}
                >
                  {WEEKDAYS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="gh-field-label">From</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="gh-input"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="gh-field-label">To</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="gh-input"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">Slot length</span>
                <select
                  className="gh-select"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  {SLOT_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </label>

              {/* Optional effective range — leave blank for "always" */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="gh-field-label">Starts (optional)</span>
                  <input
                    type="date"
                    value={effectiveFromDate}
                    onChange={(e) => setEffectiveFromDate(e.target.value)}
                    className="gh-input"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="gh-field-label">Ends (optional)</span>
                  <input
                    type="date"
                    value={effectiveUntilDate}
                    onChange={(e) => setEffectiveUntilDate(e.target.value)}
                    className="gh-input"
                  />
                </label>
              </div>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Leave dates empty for an always-active recurring window. Use
                them for holidays, vacations, or seasonal hours.
              </p>

              <Btn type="submit" variant="primary" size="sm" disabled={busy} iconLeft={<Plus className="size-3.5" />}>
                {busy ? "Adding…" : "Add window"}
              </Btn>
            </form>
          </AdminCard>

          <AdminCard padding={0}>
            <SectionHeader title="Legend" />
            <ul className="grid gap-2 p-5 text-[12px]">
              <Legend tone="open" label="Open · available to patients" />
              <Legend tone="blocked" label="Blocked · you marked busy" />
              <Legend tone="booked" label="Booked · patient claimed" />
              <Legend tone="held" label="Held · in someone's cart" />
            </ul>
            <p className="px-5 pb-5 text-[11px] text-[var(--color-text-muted)]">
              Times shown in Europe/Dublin. Patients in other locales see
              their own local time.
            </p>
          </AdminCard>
        </aside>
      </div>
    </>
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

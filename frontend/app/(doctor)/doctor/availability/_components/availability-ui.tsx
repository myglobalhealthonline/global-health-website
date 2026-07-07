"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import {
  createAvailabilityWindow,
  deleteAvailabilityWindow,
} from "@/lib/api/doctor-availability-client";
import type {
  AvailabilityWindow,
  DoctorTimeSlotView,
} from "@/lib/api/doctor-availability-types";
import type { CalendarItem } from "@/components/calendar/calendar-types";
import { DoctorAvailabilityWeekView } from "./availability-week-view";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  Btn,
  Pill,
  SectionHeader,
} from "@/components/portal-atoms";
import { FormSection } from "@/components/FormSection";
import { PortalDialog } from "@/components/PortalDialog";

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

type Props = {
  initialWindows: AvailabilityWindow[];
  initialSlots: DoctorTimeSlotView[];
  /** Booked consultations (all scheduled appointments) for the week grid. */
  consultations: CalendarItem[];
  /** Any date inside the initial week ("YYYY-MM-DD"), clinic-local. */
  initialWeekAnchor: string;
  /** Clinic timezone (Country.bookingSetting.timezone). Window minutes are
   *  wall-clock in this zone and concrete slots render in it. */
  countryTimeZone: string;
};

export function DoctorAvailabilityUI({
  initialWindows,
  initialSlots,
  consultations,
  initialWeekAnchor,
  countryTimeZone,
}: Props) {
  const router = useRouter();
  const [windows, setWindows] = useState(initialWindows);
  const [slots, setSlots] = useState(initialSlots);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ── Add-window form state ───────────────────────────────────────
  const [weekday, setWeekday] = useState(1); // Mon
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [duration, setDuration] = useState(15);
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
    setDeleteTarget(id);
  }

  function confirmDeleteWindow() {
    const id = deleteTarget;
    if (!id) return;
    setDeleteTarget(null);
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

  return (
    <>
      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: "Weekly windows",
            value: windows.length,
            hint: "Recurring schedule rules",
            tone: windows.length > 0 ? "brand" : "warning",
          },
          {
            label: "Open slots",
            value: slotCounts.open,
            hint: `${slotCounts.total} generated`,
            tone: slotCounts.open > 0 ? "success" : "neutral",
          },
          {
            label: "Booked",
            value: slotCounts.booked,
            hint: "Patient claimed",
            tone: slotCounts.booked > 0 ? "brand" : "neutral",
          },
          {
            label: "Blocked",
            value: slotCounts.blocked,
            hint: "Marked unavailable",
            tone: slotCounts.blocked > 0 ? "warning" : "neutral",
          },
        ]}
      />

      <div className="gh-doctor-detail-grid gh-doctor-availability-grid grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* ── Week calendar (same grid as the admin availability page) ─── */}
        <AdminCard padding={0} className="gh-doctor-panel">
          <SectionHeader
            title="Week calendar"
            description="Your booked appointments and open slots for the week. Click an open time to block it, a blocked time to re-open. Booked appointments are highlighted and locked here."
          />
          <div className="p-5">
            <DoctorAvailabilityWeekView
              initialSlots={initialSlots}
              consultations={consultations}
              clinicTz={countryTimeZone}
              initialWeekAnchor={initialWeekAnchor}
              onSlotsChange={setSlots}
            />
          </div>
        </AdminCard>

        {/* ── Sidebar: windows list + add form ─────────────────── */}
        <aside className="gh-doctor-side-stack grid gap-4 self-start">
          <AdminCard padding={0} className="gh-doctor-panel">
            <SectionHeader
              title="Weekly windows"
              description="Recurring blocks the system uses to generate concrete slots."
            />
            <div className="p-5">
              {windows.length === 0 ? (
                <AdminEmptyState
                  className="gh-doctor-empty-state"
                  icon={<CalendarClock className="size-5" aria-hidden />}
                  title="No weekly windows"
                  description="Create a recurring day and time band to generate public booking slots."
                />
              ) : (
                <ul className="gh-doctor-window-list grid gap-2">
                  {windows.map((w) => (
                    <li
                      key={w.id}
                      className="gh-doctor-window-row flex items-center justify-between gap-3 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--portal-text)]">
                          {WEEKDAYS.find((d) => d.value === w.weekday)?.label ?? "—"}{" "}
                          · {minutesToTime(w.startMinute)}–
                          {minutesToTime(w.endMinute)}
                        </p>
                        <p className="text-[11px] text-[var(--portal-muted)]">
                          {w.slotDurationMinutes}-min base grid
                          {!w.isActive ? " · paused" : ""}
                        </p>
                        {w.effectiveFrom || w.effectiveUntil ? (
                          <p className="text-[10px] text-[var(--portal-muted)]">
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
                      <div className="gh-doctor-window-actions flex items-center gap-2">
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

          <FormSection
            title="Add window"
            description={`A weekly recurring time band — times in ${countryTimeZone} (clinic time).`}
            className="gh-doctor-panel"
          >
            <form onSubmit={onAddWindow} className="gh-doctor-availability-form gh-form-section__span-2 grid gap-3">
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
              <div className="gh-doctor-time-grid grid grid-cols-2 gap-2">
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
                <span className="gh-field-label">Base slot length (grid)</span>
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
                <span className="text-[12px] text-[var(--portal-muted)]">
                  Consultations consume consecutive base slots to fit their
                  real length. 15 fits 15/30/45-min consults.
                </span>
              </label>

              {/* Optional effective range — leave blank for "always" */}
              <div className="gh-doctor-time-grid grid grid-cols-2 gap-2">
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
              <p className="text-[11px] text-[var(--portal-muted)]">
                Leave dates empty for an always-active recurring window. Use
                them for holidays, vacations, or seasonal hours.
              </p>

              <Btn type="submit" variant="primary" size="sm" disabled={busy} iconLeft={<Plus className="size-3.5" />}>
                {busy ? "Adding…" : "Add window"}
              </Btn>
            </form>
          </FormSection>

          <AdminCard padding={0} className="gh-doctor-panel">
            <SectionHeader title="Legend" />
            <ul className="grid gap-2 p-5 text-[12px]">
              <Legend tone="open" label="Open · available to patients" />
              <Legend tone="blocked" label="Blocked · you marked busy" />
              <Legend tone="booked" label="Booked · patient claimed" />
              <Legend tone="held" label="Held · in someone's cart" />
            </ul>
            <p className="px-5 pb-5 text-[11px] text-[var(--portal-muted)]">
              Times shown in {countryTimeZone} (clinic time). Patients booking
              this clinic see the same times.
            </p>
          </AdminCard>
        </aside>
      </div>

      <PortalDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Remove weekly window"
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Btn>
            <Btn variant="danger" onClick={confirmDeleteWindow}>
              Remove
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          Remove this weekly window? Future open slots derived from it will be cleared.
        </p>
      </PortalDialog>
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

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
type AvailabilityStrings = Record<string, string>;
type CommonStrings = Record<string, string>;

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
  strings: AvailabilityStrings;
  common: CommonStrings;
};

export function DoctorAvailabilityUI({
  initialWindows,
  initialSlots,
  consultations,
  initialWeekAnchor,
  countryTimeZone,
  strings: s,
  common,
}: Props) {
  const router = useRouter();
  const WEEKDAYS = [
    { value: 0, label: s.weekdaySun },
    { value: 1, label: s.weekdayMon },
    { value: 2, label: s.weekdayTue },
    { value: 3, label: s.weekdayWed },
    { value: 4, label: s.weekdayThu },
    { value: 5, label: s.weekdayFri },
    { value: 6, label: s.weekdaySat },
  ];
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
      setError(s.errorEndAfterStart);
      return;
    }
    if (
      effectiveFromDate &&
      effectiveUntilDate &&
      effectiveFromDate > effectiveUntilDate
    ) {
      setError(s.errorEndDateAfterStart);
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
            label: s.weeklyWindows,
            value: windows.length,
            hint: s.recurringScheduleRules,
            tone: windows.length > 0 ? "brand" : "warning",
          },
          {
            label: s.openSlots,
            value: slotCounts.open,
            hint: s.slotsGenerated.replace("{count}", String(slotCounts.total)),
            tone: slotCounts.open > 0 ? "success" : "neutral",
          },
          {
            label: s.booked,
            value: slotCounts.booked,
            hint: s.patientClaimed,
            tone: slotCounts.booked > 0 ? "brand" : "neutral",
          },
          {
            label: s.blocked,
            value: slotCounts.blocked,
            hint: s.markedUnavailable,
            tone: slotCounts.blocked > 0 ? "warning" : "neutral",
          },
        ]}
      />

      <div className="gh-doctor-detail-grid gh-doctor-availability-grid grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Week calendar (same grid as the admin availability page) ─── */}
        <AdminCard padding={0} className="gh-doctor-panel">
          <SectionHeader
            title={s.weekCalendarTitle}
            description={s.weekCalendarDesc}
          />
          <div className="p-5">
            <DoctorAvailabilityWeekView
              initialSlots={initialSlots}
              consultations={consultations}
              clinicTz={countryTimeZone}
              initialWeekAnchor={initialWeekAnchor}
              onSlotsChange={setSlots}
              strings={{ weekViewHelp: s.weekViewHelp }}
            />
          </div>
        </AdminCard>

        {/* ── Sidebar: windows list + add form ─────────────────── */}
        <aside className="gh-doctor-side-stack grid gap-4 self-start">
          <AdminCard padding={0} className="gh-doctor-panel">
            <SectionHeader
              title={s.weeklyWindows}
              description={s.weeklyWindowsDesc}
            />
            <div className="p-5">
              {windows.length === 0 ? (
                <AdminEmptyState
                  className="gh-doctor-empty-state"
                  icon={<CalendarClock className="size-5" aria-hidden />}
                  title={s.noWindowsTitle}
                  description={s.noWindowsDesc}
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
                          {s.baseGrid.replace("{duration}", String(w.slotDurationMinutes))}
                          {!w.isActive ? s.paused : ""}
                        </p>
                        {w.effectiveFrom || w.effectiveUntil ? (
                          <p className="text-[10px] text-[var(--portal-muted)]">
                            {w.effectiveFrom
                              ? s.fromDate.replace("{date}", new Date(w.effectiveFrom).toLocaleDateString("en-IE"))
                              : s.fromAlways}
                            {" "}·{" "}
                            {w.effectiveUntil
                              ? s.untilDate.replace("{date}", new Date(w.effectiveUntil).toLocaleDateString("en-IE"))
                              : s.forever}
                          </p>
                        ) : null}
                      </div>
                      <div className="gh-doctor-window-actions flex items-center gap-2">
                        <Pill tone={w.isActive ? "active" : "neutral"}>
                          {w.isActive ? s.active : s.pausedPill}
                        </Pill>
                        <button
                          type="button"
                          onClick={() => onDeleteWindow(w.id)}
                          disabled={busy}
                          aria-label={s.deleteWindow}
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
            title={s.addWindow}
            description={s.addWindowDesc.replace("{tz}", countryTimeZone)}
            className="gh-doctor-panel"
          >
            <form onSubmit={onAddWindow} className="gh-doctor-availability-form gh-form-section__span-2 grid gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{s.day}</span>
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
                  <span className="gh-field-label">{common.from}</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="gh-input"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="gh-field-label">{common.to}</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="gh-input"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm">
                <span className="gh-field-label">{s.baseSlotLength}</span>
                <select
                  className="gh-select"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  {SLOT_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {s.minutesShort.replace("{count}", String(d))}
                    </option>
                  ))}
                </select>
                <span className="text-[12px] text-[var(--portal-muted)]">
                  {s.baseSlotHint}
                </span>
              </label>

              {/* Optional effective range — leave blank for "always" */}
              <div className="gh-doctor-time-grid grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="gh-field-label">{s.startsOptional}</span>
                  <input
                    type="date"
                    value={effectiveFromDate}
                    onChange={(e) => setEffectiveFromDate(e.target.value)}
                    className="gh-input"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="gh-field-label">{s.endsOptional}</span>
                  <input
                    type="date"
                    value={effectiveUntilDate}
                    onChange={(e) => setEffectiveUntilDate(e.target.value)}
                    className="gh-input"
                  />
                </label>
              </div>
              <p className="text-[11px] text-[var(--portal-muted)]">
                {s.datesHint}
              </p>

              <Btn type="submit" variant="primary" size="sm" disabled={busy} iconLeft={<Plus className="size-3.5" />}>
                {busy ? s.adding : s.addWindow}
              </Btn>
            </form>
          </FormSection>

          <AdminCard padding={0} className="gh-doctor-panel">
            <SectionHeader title={s.legend} />
            <ul className="grid gap-2 p-5 text-[12px]">
              <Legend tone="open" label={s.legendOpen} />
              <Legend tone="blocked" label={s.legendBlocked} />
              <Legend tone="booked" label={s.legendBooked} />
              <Legend tone="held" label={s.legendHeld} />
            </ul>
            <p className="px-5 pb-5 text-[11px] text-[var(--portal-muted)]">
              {s.timesShownIn.replace("{tz}", countryTimeZone)}
            </p>
          </AdminCard>
        </aside>
      </div>

      <PortalDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={s.removeWindowTitle}
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDeleteTarget(null)}>
              {s.cancel}
            </Btn>
            <Btn variant="danger" onClick={confirmDeleteWindow}>
              {s.remove}
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          {s.removeWindowBody}
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

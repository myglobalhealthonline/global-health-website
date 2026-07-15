"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CalendarClock, CheckCircle2, Plus, Trash2, UserRound } from "lucide-react";
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

// Effective-date ranges overlap when both are unbounded or bounded ends
// cross; null/"" means "always" on that side. Dates compare fine as
// YYYY-MM-DD strings.
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
  // Single top-of-page banner for API/network failures (05-005 — the week
  // grid used to keep its own duplicate banner; it now reports up here).
  const [error, setError] = useState<string | null>(null);
  // Inline, field-adjacent validation errors for the add-window form
  // (05-006 — these used to render in the shared top banner, far from the
  // offending field).
  const [fieldError, setFieldError] = useState<{ field: "time" | "date"; message: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const deleteTarget = windows.find((w) => w.id === deleteTargetId) ?? null;

  // ── Add-window form state ───────────────────────────────────────
  const [weekday, setWeekday] = useState(1); // Mon
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [duration, setDuration] = useState(15);
  // ISO date strings (YYYY-MM-DD). Empty = "always" / "forever".
  const [effectiveFromDate, setEffectiveFromDate] = useState("");
  const [effectiveUntilDate, setEffectiveUntilDate] = useState("");

  // Non-blocking overlap warning: does the in-progress form conflict with an
  // existing active window on the same weekday within an overlapping
  // effective-date range? Doesn't prevent submit — legitimate overlaps
  // (e.g. a temporary extra evening clinic) do exist.
  const overlapWindow = useMemo(() => {
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) return null;
    return (
      windows.find(
        (w) =>
          w.isActive &&
          w.weekday === weekday &&
          startMin < w.endMinute &&
          endMin > w.startMinute &&
          dateRangesOverlap(w.effectiveFrom, w.effectiveUntil, effectiveFromDate, effectiveUntilDate),
      ) ?? null
    );
  }, [windows, weekday, startTime, endTime, effectiveFromDate, effectiveUntilDate]);

  function onAddWindow(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    if (endMin <= startMin) {
      setFieldError({ field: "time", message: s.errorEndAfterStart });
      return;
    }
    if (
      effectiveFromDate &&
      effectiveUntilDate &&
      effectiveFromDate > effectiveUntilDate
    ) {
      setFieldError({ field: "date", message: s.errorEndDateAfterStart });
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
      // Reset the whole add-form, not just the dates. Leaving weekday/time
      // as-is made the non-blocking overlap warning fire against the window
      // the doctor had just successfully added — a confusing false positive.
      setWeekday(1);
      setStartTime("09:00");
      setEndTime("17:00");
      setDuration(15);
      setEffectiveFromDate("");
      setEffectiveUntilDate("");
      router.refresh();
    });
  }

  function onDeleteWindow(id: string) {
    setDeleteTargetId(id);
  }

  function confirmDeleteWindow() {
    const id = deleteTargetId;
    if (!id) return;
    setDeleteTargetId(null);
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

  // 05-003: near-duplicate windows on the same weekday (e.g. two "Mon
  // 09:00–17:00") were indistinguishable at a glance. Group by weekday with
  // a subheading and sort within it by effective-from date, so identity
  // lives in structure instead of a barely-legible date sub-line.
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
              onError={setError}
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
                  {windowGroups.map((group) => {
                    const hasDuplicates = group.items.length > 1;
                    return (
                      <li key={group.weekday} className="grid gap-2">
                        {hasDuplicates ? (
                          <p className="text-portal-micro font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
                            {WEEKDAYS.find((d) => d.value === group.weekday)?.label ?? "—"}
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
                                    ? `${WEEKDAYS.find((d) => d.value === w.weekday)?.label ?? "—"} · `
                                    : ""}
                                  {minutesToTime(w.startMinute)}–
                                  {minutesToTime(w.endMinute)}
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
                                      ? s.fromDate.replace("{date}", new Date(w.effectiveFrom).toLocaleDateString("en-IE"))
                                      : s.fromAlways}
                                    {" "}·{" "}
                                    {w.effectiveUntil
                                      ? s.untilDate.replace("{date}", new Date(w.effectiveUntil).toLocaleDateString("en-IE"))
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
                                  onClick={() => onDeleteWindow(w.id)}
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
              {fieldError?.field === "time" ? (
                <p className="text-sm text-rose-700">{fieldError.message}</p>
              ) : null}
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
                <span className="text-portal-meta text-[var(--portal-muted)]">
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
              {fieldError?.field === "date" ? (
                <p className="text-sm text-rose-700">{fieldError.message}</p>
              ) : null}
              <p className="text-portal-thead text-[var(--portal-muted)]">
                {s.datesHint}
              </p>

              {overlapWindow ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {s.overlapWarning
                    .replace("{day}", WEEKDAYS.find((d) => d.value === overlapWindow.weekday)?.label ?? "—")
                    .replace("{start}", minutesToTime(overlapWindow.startMinute))
                    .replace("{end}", minutesToTime(overlapWindow.endMinute))}
                </p>
              ) : null}

              <Btn type="submit" variant="primary" size="sm" disabled={busy} iconLeft={<Plus className="size-3.5" />}>
                {busy ? s.adding : s.addWindow}
              </Btn>
            </form>
          </FormSection>

          <AdminCard padding={0} className="gh-doctor-panel">
            <SectionHeader title={s.legend} />
            <ul className="grid gap-2 p-5 text-portal-meta">
              <Legend tone="open" label={s.legendOpen} />
              <Legend tone="blocked" label={s.legendBlocked} />
              <Legend tone="booked" label={s.legendBooked} />
              <Legend tone="held" label={s.legendHeld} />
            </ul>
            <p className="px-5 pb-5 text-portal-thead text-[var(--portal-muted)]">
              {s.timesShownIn.replace("{tz}", countryTimeZone)}
            </p>
          </AdminCard>
        </aside>
      </div>

      <PortalDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTargetId(null)}
        title={
          deleteTarget
            ? s.removeWindowTitleNamed
                .replace("{day}", WEEKDAYS.find((d) => d.value === deleteTarget.weekday)?.label ?? "—")
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
            <Btn variant="danger" onClick={confirmDeleteWindow}>
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

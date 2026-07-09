"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, Loader2 } from "lucide-react";
import { formatAppDate, formatAppTime } from "@/lib/format-datetime";
import { rescheduleAccountAppointment } from "@/lib/api/account-appointment-actions";
import { AdminEmptyState, Btn } from "@/components/portal-atoms";

type Slot = {
  id: string;
  startAt: string;
  endAt: string;
};

type RescheduleI18n = {
  pickNewDate: string;
  dayAvailable: string;
  daysAvailable: string;
  slotAvailable: string;
  slotsAvailable: string;
  timesOn: string;
  current: string;
  rescheduled: string;
  takingYouBack: string;
  noOpenTimesTitle: string;
  noOpenTimesBody: string;
  backToBookings: string;
  availableDates: string;
};

const DEFAULT_I18N: RescheduleI18n = {
  pickNewDate: "Pick a new date",
  dayAvailable: "{count} day available",
  daysAvailable: "{count} days available",
  slotAvailable: "{count} slot",
  slotsAvailable: "{count} slots",
  timesOn: "Times on {day}",
  current: "Current",
  rescheduled: "Booking rescheduled",
  takingYouBack: "Taking you back to your bookings…",
  noOpenTimesTitle: "No open times right now",
  noOpenTimesBody:
    "Your clinician has no available slots in the next two weeks. Cancel this booking and rebook, or message the clinic to ask for a specific time.",
  backToBookings: "Back to bookings",
  availableDates: "Available dates",
};

type Props = {
  appointmentId: string;
  slots: Slot[];
  clinicTimezone: string;
  currentTimeSlotId: string | null;
  i18n?: RescheduleI18n;
};

/**
 * Standalone reschedule slot picker — day pills + time grid, same visual
 * language as the public booking wizard's SlotPickerStep (gh2-selectable /
 * gh2-status-card), but driven by a local onSelect callback + PATCH instead
 * of URL navigation. The wizard's version is wired to router.push + a
 * multi-step form; rebuilding that coupling here for a one-shot picker
 * would be more code than this, so it's a fresh small component instead of
 * an import.
 */
export function ReschedulePicker({ appointmentId, slots, clinicTimezone, currentTimeSlotId, i18n = DEFAULT_I18N }: Props) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tz = clinicTimezone || "UTC";
  const openSlots = useMemo(
    () => slots.filter((slot) => new Date(slot.startAt).getTime() > now),
    [slots, now],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of openSlots) {
      const day = formatAppDate(s.startAt, tz);
      const list = map.get(day) ?? [];
      list.push(s);
      map.set(day, list);
    }
    return map;
  }, [openSlots, tz]);

  const firstSlot = openSlots[0] ?? null;
  const [selectedDay, setSelectedDay] = useState<string | null>(
    firstSlot ? formatAppDate(firstSlot.startAt, tz) : null,
  );

  function chooseSlot(slotId: string) {
    setError(null);
    startSubmit(async () => {
      const res = await rescheduleAccountAppointment(appointmentId, slotId);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDone(true);
      router.push("/account/bookings");
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="gh2-status-card text-center">
        <Check className="mx-auto size-6 text-[var(--color-brand-primary)]" aria-hidden />
        <p className="mt-3 font-semibold text-[var(--color-text-primary)]">{i18n.rescheduled}</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">{i18n.takingYouBack}</p>
      </div>
    );
  }

  if (openSlots.length === 0) {
    return (
      <AdminEmptyState
        icon={<Calendar className="size-6" aria-hidden />}
        title={i18n.noOpenTimesTitle}
        description={i18n.noOpenTimesBody}
        action={
          <Btn href="/account/bookings" variant="ghost" size="sm">
            {i18n.backToBookings}
          </Btn>
        }
      />
    );
  }

  return (
    <div className="min-w-0">
      {error ? (
        <div
          className="mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm"
          style={{ borderColor: "var(--portal-danger)", background: "var(--portal-danger-soft)", color: "var(--portal-danger-text)" }}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {i18n.pickNewDate}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {(grouped.size === 1 ? i18n.dayAvailable : i18n.daysAvailable).replace("{count}", String(grouped.size))}
        </p>
      </div>

      <div
        role="tablist"
        aria-label={i18n.availableDates}
        className="gh2-scroll-fade mt-3 -mx-1 flex min-w-0 max-w-full gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
      >
        {Array.from(grouped.entries()).map(([day, daySlots]) => {
          const isActive = selectedDay === day;
          const firstSlotAt = daySlots[0]?.startAt;
          const date = firstSlotAt ? new Date(firstSlotAt) : null;
          const weekday = date ? date.toLocaleDateString(undefined, { weekday: "short", timeZone: tz }) : "";
          const dayNum = date ? date.toLocaleDateString(undefined, { day: "numeric", timeZone: tz }) : "";
          const month = date ? date.toLocaleDateString(undefined, { month: "short", timeZone: tz }) : "";
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedDay(day)}
              disabled={submitting}
              data-selected={isActive}
              className={
                isActive
                  ? "gh2-selectable relative flex shrink-0 flex-col items-center gap-0.5 rounded-2xl px-4 py-3 min-w-[68px] shadow-[var(--shadow-card)]"
                  : "gh2-selectable flex shrink-0 flex-col items-center gap-0.5 rounded-2xl border-[rgba(29,75,54,.18)] bg-white px-4 py-3 min-w-[68px] text-[var(--color-text-body)] transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-60"
              }
            >
              {isActive ? (
                <Check className="absolute right-1.5 top-1.5 size-3.5 text-white" aria-hidden />
              ) : null}
              <span className={isActive ? "text-[10px] font-bold uppercase tracking-[0.12em] text-white/80" : "text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]"}>
                {weekday}
              </span>
              <span className={isActive ? "text-2xl font-bold leading-none [font-variant-numeric:tabular-nums] text-white" : "text-2xl font-bold leading-none [font-variant-numeric:tabular-nums] text-[var(--color-text-primary)]"}>
                {dayNum}
              </span>
              <span className={isActive ? "text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70" : "text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-muted)]"}>
                {month}
              </span>
              <span className={isActive ? "mt-1 text-[10px] font-semibold text-white/80" : "mt-1 text-[10px] font-semibold text-[var(--color-brand-primary)]"}>
                {(daySlots.length === 1 ? i18n.slotAvailable : i18n.slotsAvailable).replace("{count}", String(daySlots.length))}
              </span>
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <div className="mt-6 w-full overflow-hidden">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
            {i18n.timesOn.replace("{day}", selectedDay)}
          </p>
          <div
            role="tabpanel"
            aria-label={i18n.timesOn.replace("{day}", selectedDay)}
            className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 w-full"
          >
            {(grouped.get(selectedDay) ?? []).map((s) => {
              const isCurrent = s.id === currentTimeSlotId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => chooseSlot(s.id)}
                  disabled={submitting}
                  className="gh2-selectable flex flex-col items-center justify-center gap-1 rounded-lg border-[rgba(29,75,54,.18)] bg-white px-2 py-2 text-xs text-[var(--color-text-primary)] sm:text-sm font-semibold [font-variant-numeric:tabular-nums] transition-transform duration-200 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:opacity-60 min-h-[70px] sm:min-h-[80px]"
                >
                  <span className="flex items-center justify-center gap-1 leading-tight">
                    {submitting ? <Loader2 className="size-2.5 sm:size-3 animate-spin" aria-hidden /> : null}
                    <span className="truncate">{formatAppTime(s.startAt, tz)}</span>
                  </span>
                  {isCurrent ? (
                    <span className="rounded-full bg-[rgba(29,75,54,0.08)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      {i18n.current}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

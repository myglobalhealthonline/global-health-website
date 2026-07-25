"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { fetchAvailabilityRangeClient } from "@/lib/api/doctor-availability-client";
import type { DoctorTimeSlotView } from "@/lib/api/doctor-availability-types";

/**
 * Spin a follow-up appointment off the current one.
 *
 * The doctor picks a REAL open slot from their own calendar — not a
 * free-text time. The backend atomically holds that slot, bills the
 * follow-up at the source consultation's price, and runs the standard
 * pre-payment notification sequence (patient + doctor). A slot taken
 * between load and submit comes back as a 409 the doctor can retry.
 */
export type FollowUpButtonCopy = {
  bookFollowUp: string;
  newFollowUpTitle: string;
  whenLabel: string;
  deliveryLabel: string;
  onlineOption: string;
  inPersonOption: string;
  notesLabel: string;
  notesPlaceholder: string;
  cancel: string;
  creating: string;
  createButton: string;
  couldNotCreate: string;
  /** Shown while the doctor's calendar is being fetched. */
  loadingSlots: string;
  /** No OPEN slot in the look-ahead window — doctor must add availability. */
  noOpenSlots: string;
  dayLabel: string;
  timeLabel: string;
  /** Submit attempted with no slot chosen. */
  selectSlotFirst: string;
  /** Explains billing + notifications so the doctor knows what the patient gets. */
  billingNote: string;
};

/** How far ahead to offer follow-up slots. */
const LOOKAHEAD_DAYS = 60;

export function FollowUpButton({
  appointmentId,
  copy,
}: {
  appointmentId: string;
  copy: FollowUpButtonCopy;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<DoctorTimeSlotView[]>([]);
  const [clinicTimezone, setClinicTimezone] = useState<string | undefined>();
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"ONLINE" | "IN_PERSON">("ONLINE");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    setError(null);
    const from = new Date();
    const to = new Date(from.getTime() + LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
    const res = await fetchAvailabilityRangeClient(from.toISOString(), to.toISOString());
    if (!res.ok) {
      setError(res.message);
      setSlots([]);
    } else {
      const now = Date.now();
      // Only genuinely bookable slots: OPEN and still in the future. HELD /
      // BOOKED / BLOCKED are someone else's (or the doctor's own time off).
      setSlots(
        res.data.slots.filter(
          (s) => s.status === "OPEN" && new Date(s.startAt).getTime() > now,
        ),
      );
      setClinicTimezone(res.data.clinicTimezone);
    }
    setLoadingSlots(false);
  }, []);

  // Group by clinic-local day so the doctor reads their own working hours,
  // not the browser's timezone.
  const tz = clinicTimezone;
  const byDay = useMemo(() => {
    const map = new Map<string, DoctorTimeSlotView[]>();
    for (const s of slots) {
      const label = new Date(s.startAt).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: tz,
      });
      const bucket = map.get(label);
      if (bucket) bucket.push(s);
      else map.set(label, [s]);
    }
    return map;
  }, [slots, tz]);

  const days = useMemo(() => Array.from(byDay.keys()), [byDay]);
  // Derived, not stored: `selectedDay` holds an explicit choice, and we fall
  // back to the first day with availability until the doctor makes one. Keeps
  // the calendar reload from needing an effect to re-sync the selection.
  const activeDay = selectedDay && days.includes(selectedDay) ? selectedDay : (days[0] ?? "");
  const daySlots = activeDay ? (byDay.get(activeDay) ?? []) : [];

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz,
    });
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!selectedSlotId) {
      setError(copy.selectSlotFirst);
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/follow-up`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            timeSlotId: selectedSlotId,
            consultationType: "follow-up",
            notes: notes.trim() || undefined,
            consultationMode: mode,
          }),
        },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { appointment?: { id: string } };
      };
      if (!res.ok || !json.ok || !json.data?.appointment) {
        setError(json.message ?? copy.couldNotCreate);
        // 409 = the slot went while the dialog was open. Refresh the
        // calendar so the doctor picks from what's actually left. Clear the
        // day too, so the reloaded list doesn't strand the doctor on a day
        // that may no longer have any open slots.
        if (res.status === 409) {
          setSelectedSlotId("");
          setSelectedDay("");
          void loadSlots();
        }
        return;
      }
      setOpen(false);
      router.push(`/doctor/appointments/${json.data.appointment.id}`);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          // Fetch on the click, not in an effect — opening the dialog IS the
          // event that needs fresh availability.
          void loadSlots();
        }}
        className="gh-btn gh-btn-soft"
      >
        <CalendarPlus className="size-3.5" /> {copy.bookFollowUp}
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3"
    >
      <p className="text-portal-meta font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
        {copy.newFollowUpTitle}
      </p>
      <div className="mt-2 grid gap-2">
        <div className="flex flex-col gap-1">
          <span className="gh-field-label">{copy.whenLabel}</span>
          {loadingSlots ? (
            <p className="text-portal-label text-[var(--portal-muted)]">
              {copy.loadingSlots}
            </p>
          ) : days.length === 0 ? (
            <p className="text-portal-label text-[var(--portal-muted)]">
              {copy.noOpenSlots}
            </p>
          ) : (
            <div className="grid gap-2">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">{copy.dayLabel}</span>
                <select
                  className="gh-select"
                  value={activeDay}
                  onChange={(e) => {
                    setSelectedDay(e.target.value);
                    setSelectedSlotId("");
                  }}
                >
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-1">
                <span className="gh-field-label">{copy.timeLabel}</span>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {daySlots.map((s) => {
                    const isSelected = s.id === selectedSlotId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedSlotId(s.id)}
                        className={
                          isSelected
                            ? "gh-btn gh-btn-primary justify-center px-2 py-1.5 text-portal-label"
                            : "gh-btn gh-btn-soft justify-center px-2 py-1.5 text-portal-label"
                        }
                      >
                        {formatTime(s.startAt)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{copy.deliveryLabel}</span>
          <select
            className="gh-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as "ONLINE" | "IN_PERSON")}
          >
            <option value="ONLINE">{copy.onlineOption}</option>
            <option value="IN_PERSON">{copy.inPersonOption}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{copy.notesLabel}</span>
          <textarea
            className="gh-input min-h-[4rem] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={copy.notesPlaceholder}
            maxLength={2000}
          />
        </label>
        <p className="text-portal-label text-[var(--portal-muted)]">
          {copy.billingNote}
        </p>
        {error ? (
          <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="gh-btn gh-btn-soft"
          >
            {copy.cancel}
          </button>
          <button
            type="submit"
            disabled={pending || !selectedSlotId}
            className="gh-btn gh-btn-primary"
          >
            {pending ? copy.creating : copy.createButton}
          </button>
        </div>
      </div>
    </form>
  );
}

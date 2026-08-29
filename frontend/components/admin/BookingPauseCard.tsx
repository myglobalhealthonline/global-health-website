import { AdminCard } from "@/components/portal-atoms";
import { utcInstantToZonedInput } from "@/lib/booking-pause-time";
import { timeZoneLabel } from "@/lib/timezones";

export type BookingPauseValue = {
  from?: string | null;
  until?: string | null;
  reasonCode?: "LEAVE" | "TEMPORARY_UNAVAILABLE" | "OTHER" | null;
};

export function BookingPauseCard({
  value,
  saveAction,
  clearAction,
  timeZone,
  subject = "online bookings",
}: {
  value: BookingPauseValue;
  saveAction: (formData: FormData) => Promise<void>;
  clearAction: (formData: FormData) => Promise<void>;
  timeZone: string;
  subject?: string;
}) {
  const active = Boolean(value.from);
  const zoneLabel = timeZoneLabel(timeZone);
  return (
    <AdminCard>
      <h3 className="m-0 text-base font-extrabold text-[var(--color-text-primary)]">
        Booking pause
      </h3>
      <p className="mb-4 mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Keep the public page live while temporarily disabling {subject}. Existing appointments
        are not cancelled; review the calendar before saving. Times below use {zoneLabel}.
      </p>
      <form action={saveAction} className="grid gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          Starts ({zoneLabel})
          <input
            className="gh-input"
            type="datetime-local"
            name="from"
            required
            defaultValue={utcInstantToZonedInput(value.from, timeZone)}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Ends ({zoneLabel}, optional)
          <input
            className="gh-input"
            type="datetime-local"
            name="until"
            defaultValue={utcInstantToZonedInput(value.until, timeZone)}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Reason
          <select className="gh-input" name="reasonCode" defaultValue={value.reasonCode ?? "LEAVE"}>
            <option value="LEAVE">Leave</option>
            <option value="TEMPORARY_UNAVAILABLE">Temporarily unavailable</option>
            <option value="OTHER">Other operational reason</option>
          </select>
        </label>
        <button type="submit" className="gh-btn gh-btn-primary justify-center">
          {active ? "Update pause" : "Pause bookings"}
        </button>
      </form>
      {active ? (
        <form action={clearAction} className="mt-2">
          <button type="submit" className="gh-btn gh-btn-ghost w-full justify-center">
            Clear pause
          </button>
        </form>
      ) : null}
    </AdminCard>
  );
}

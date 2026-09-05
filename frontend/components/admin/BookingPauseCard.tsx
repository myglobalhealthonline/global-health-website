import { AdminCard } from "@/components/portal-atoms";
import { PendingSubmitButton } from "@/components/admin/pending-submit";
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
        {/* Pausing bookings is a real state change on a live service, and the
            action redirects back to this same route — so a second click while
            the first is in flight re-posts the same window. Each of this
            card's two forms carries its own `PendingSubmitButton`, so
            `useFormStatus` scopes the lock to the form it sits in and the
            Clear button below stays live while this one saves. */}
        <PendingSubmitButton
          className="gh-btn gh-btn-primary justify-center"
          busyLabel="Saving…"
        >
          {active ? "Update pause" : "Pause bookings"}
        </PendingSubmitButton>
      </form>
      {active ? (
        <form action={clearAction} className="mt-2">
          <PendingSubmitButton
            className="gh-btn gh-btn-ghost w-full justify-center"
            busyLabel="Clearing…"
          >
            Clear pause
          </PendingSubmitButton>
        </form>
      ) : null}
    </AdminCard>
  );
}

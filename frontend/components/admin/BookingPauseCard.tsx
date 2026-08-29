import { AdminCard } from "@/components/portal-atoms";

export type BookingPauseValue = {
  from?: string | null;
  until?: string | null;
  reasonCode?: "LEAVE" | "TEMPORARY_UNAVAILABLE" | "OTHER" | null;
};

function utcInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

export function BookingPauseCard({
  value,
  saveAction,
  clearAction,
  subject = "online bookings",
}: {
  value: BookingPauseValue;
  saveAction: (formData: FormData) => Promise<void>;
  clearAction: (formData: FormData) => Promise<void>;
  subject?: string;
}) {
  const active = Boolean(value.from);
  return (
    <AdminCard>
      <h3 className="m-0 text-base font-extrabold text-[var(--color-text-primary)]">
        Booking pause
      </h3>
      <p className="mb-4 mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
        Keep the public page live while temporarily disabling {subject}. Existing appointments
        are not cancelled; review the calendar before saving.
      </p>
      <form action={saveAction} className="grid gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          Starts (UTC)
          <input
            className="gh-input"
            type="datetime-local"
            name="from"
            required
            defaultValue={utcInputValue(value.from)}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Ends (UTC, optional)
          <input
            className="gh-input"
            type="datetime-local"
            name="until"
            defaultValue={utcInputValue(value.until)}
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

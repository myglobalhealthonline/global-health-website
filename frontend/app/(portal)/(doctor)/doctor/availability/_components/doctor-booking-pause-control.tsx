"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminCard } from "@/components/portal-atoms";
import type { DoctorAvailabilityResponse } from "@/lib/api/doctor-availability-types";

type Pause = DoctorAvailabilityResponse["bookingPause"];

function inputValue(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
}

export function DoctorBookingPauseControl({ initial }: { initial: Pause }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(formData: FormData) {
    setPending(true);
    setMessage(null);
    const from = String(formData.get("from") ?? "");
    const until = String(formData.get("until") ?? "");
    const response = await fetch("/api/doctor/booking-pause", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        from: `${from}:00.000Z`,
        until: until ? `${until}:00.000Z` : null,
        reasonCode: String(formData.get("reasonCode") ?? "LEAVE"),
      }),
    });
    const json = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok || !json.ok) {
      setMessage(json.message ?? "Could not save the booking pause");
      return;
    }
    setMessage("Booking pause saved. Existing appointments are unchanged.");
    router.refresh();
  }

  async function clear() {
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/doctor/booking-pause", { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok || !json.ok) {
      setMessage(json.message ?? "Could not clear the booking pause");
      return;
    }
    setMessage("Booking pause cleared.");
    router.refresh();
  }

  return (
    <AdminCard>
      <h2 className="m-0 text-lg font-extrabold">Pause online bookings</h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Your public profile stays visible. Booking buttons are disabled for the pause period.
        Existing appointments are not cancelled.
      </p>
      <form action={save} className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold">
          Starts (UTC)
          <input className="gh-input" type="datetime-local" name="from" required defaultValue={inputValue(initial.bookingPausedFrom)} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Ends (optional, UTC)
          <input className="gh-input" type="datetime-local" name="until" defaultValue={inputValue(initial.bookingPausedUntil)} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Reason
          <select className="gh-input" name="reasonCode" defaultValue={initial.bookingPauseReason ?? "LEAVE"}>
            <option value="LEAVE">Leave</option>
            <option value="TEMPORARY_UNAVAILABLE">Temporarily unavailable</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          <button className="gh-btn gh-btn-primary" type="submit" disabled={pending}>
            {initial.bookingPausedFrom ? "Update pause" : "Pause bookings"}
          </button>
          {initial.bookingPausedFrom ? (
            <button className="gh-btn gh-btn-ghost" type="button" disabled={pending} onClick={clear}>
              Clear pause
            </button>
          ) : null}
        </div>
      </form>
      {message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
    </AdminCard>
  );
}

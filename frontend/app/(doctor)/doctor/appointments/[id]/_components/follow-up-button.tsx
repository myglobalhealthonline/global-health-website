"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";

/**
 * Spin a follow-up appointment off the current one. Defaults to a
 * one-week-out slot in the doctor's browser local time; the doctor
 * can edit before submitting. Copies patient, country, doctor, and
 * delivery mode from the source row.
 */
export function FollowUpButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"ONLINE" | "IN_PERSON">("ONLINE");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    let iso: string | null = null;
    if (scheduledAtLocal) {
      const parsed = new Date(scheduledAtLocal);
      if (Number.isNaN(parsed.getTime())) {
        setError("Invalid date/time.");
        return;
      }
      iso = parsed.toISOString();
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/follow-up`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scheduledAt: iso,
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
        setError(json.message ?? "Could not create follow-up");
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
        onClick={() => setOpen(true)}
        className="gh-btn gh-btn-soft"
      >
        <CalendarPlus className="size-3.5" /> Book follow-up
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] p-3"
    >
      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        New follow-up
      </p>
      <div className="mt-2 grid gap-2">
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">When</span>
          <input
            type="datetime-local"
            className="gh-input"
            value={scheduledAtLocal}
            onChange={(e) => setScheduledAtLocal(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Delivery</span>
          <select
            className="gh-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as "ONLINE" | "IN_PERSON")}
          >
            <option value="ONLINE">Online (video)</option>
            <option value="IN_PERSON">In person</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Notes (optional)</span>
          <textarea
            className="gh-input min-h-[4rem] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for follow-up, instructions for patient…"
            maxLength={2000}
          />
        </label>
        {error ? (
          <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="gh-btn gh-btn-soft"
          >
            Cancel
          </button>
          <button type="submit" disabled={pending} className="gh-btn gh-btn-primary">
            {pending ? "Creating…" : "Create follow-up"}
          </button>
        </div>
      </div>
    </form>
  );
}

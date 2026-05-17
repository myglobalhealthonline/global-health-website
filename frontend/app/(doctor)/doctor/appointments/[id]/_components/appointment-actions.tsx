"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Save, Video } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "REQUEST_RECEIVED", label: "Request received" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const MODE_OPTIONS = [
  { value: "ONLINE", label: "Online (video)" },
  { value: "IN_PERSON", label: "In person" },
];

/**
 * Doctor-side appointment-actions card. Lets the doctor:
 *   • set / clear the meeting URL (Google Meet / Zoom / Teams /
 *     Whereby / Daily)
 *   • move the appointment through its status state machine
 *   • reschedule (scheduledAt) without going through admin
 *   • flip between ONLINE and IN_PERSON delivery
 *
 * Everything saves in a single PATCH so a typical flow like
 * "paste link → mark Contacted" or "reschedule + flip to in-person"
 * is one round-trip.
 */

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(local: string): string | null {
  if (!local) return null;
  // datetime-local emits a local-wall-clock string. Build a Date via
  // the local interpretation, then serialise as ISO so the server
  // stores a proper UTC instant.
  const parsed = new Date(local);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function AppointmentActions({
  appointmentId,
  initialMeetingUrl,
  initialStatus,
  initialScheduledAt,
  initialMode,
}: {
  appointmentId: string;
  initialMeetingUrl: string | null;
  initialStatus: string;
  initialScheduledAt: string | null;
  initialMode: "ONLINE" | "IN_PERSON";
}) {
  const router = useRouter();
  const [meetingUrl, setMeetingUrl] = useState(initialMeetingUrl ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [scheduledAtLocal, setScheduledAtLocal] = useState(
    toLocalInputValue(initialScheduledAt),
  );
  const [mode, setMode] = useState<"ONLINE" | "IN_PERSON">(initialMode);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const payload: Record<string, unknown> = {};
    const trimmed = meetingUrl.trim();
    if (trimmed !== (initialMeetingUrl ?? "")) {
      payload.meetingUrl = trimmed === "" ? null : trimmed;
    }
    if (status !== initialStatus) {
      payload.status = status;
    }
    const newScheduledIso = fromLocalInputValue(scheduledAtLocal);
    if (
      (newScheduledIso ?? null) !== (initialScheduledAt ?? null) ||
      (initialScheduledAt && !scheduledAtLocal)
    ) {
      payload.scheduledAt = newScheduledIso;
    }
    if (mode !== initialMode) {
      payload.consultationMode = mode;
    }
    if (Object.keys(payload).length === 0) {
      setMessage({ kind: "error", text: "Nothing to change." });
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/doctor/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setMessage({ kind: "error", text: json.message ?? "Could not save" });
        return;
      }
      setMessage({ kind: "success", text: "Saved" });
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="mt-3 grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" /> Slot (your local time)
          </span>
          <input
            type="datetime-local"
            className="gh-input"
            value={scheduledAtLocal}
            onChange={(e) => setScheduledAtLocal(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Delivery</span>
          <select
            className="gh-select"
            value={mode}
            onChange={(e) =>
              setMode(e.target.value as "ONLINE" | "IN_PERSON")
            }
          >
            {MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">Meeting URL</span>
        <input
          type="url"
          className="gh-input font-mono text-[12px]"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder={
            mode === "IN_PERSON"
              ? "Leave blank for in-person consults"
              : "https://meet.google.com/abc-defg-hij"
          }
          maxLength={500}
        />
        <span className="text-[11.5px] text-[var(--color-text-muted)]">
          Google Meet, Zoom, Teams, Whereby, or Daily. The patient sees
          this on their account once you save.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">Appointment status</span>
        <select
          className="gh-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {message ? (
        <p
          className={`${
            message.kind === "success" ? "gh-status-success" : "gh-status-warning"
          } rounded-md border px-3 py-2 text-sm`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-brand-primary)] hover:underline"
          >
            <Video className="size-3.5" /> Test link
          </a>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending}
          className="gh-btn gh-btn-primary"
        >
          <Save className="size-3.5" /> {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

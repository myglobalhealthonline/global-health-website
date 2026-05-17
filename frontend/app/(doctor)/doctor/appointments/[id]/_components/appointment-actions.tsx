"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Video } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "REQUEST_RECEIVED", label: "Request received" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

/**
 * Doctor-side appointment-actions card. Lets the doctor:
 *   • set / clear the meeting URL (Google Meet, Zoom, Teams, Whereby, Daily)
 *   • move the appointment through its status state machine
 *
 * Both fields are saved together because the typical doctor flow is
 * "paste link → mark as Contacted" or "complete the consult → mark as
 * Completed", and a single roundtrip keeps the audit trail clean.
 */
export function AppointmentActions({
  appointmentId,
  initialMeetingUrl,
  initialStatus,
}: {
  appointmentId: string;
  initialMeetingUrl: string | null;
  initialStatus: string;
}) {
  const router = useRouter();
  const [meetingUrl, setMeetingUrl] = useState(initialMeetingUrl ?? "");
  const [status, setStatus] = useState(initialStatus);
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
      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">Meeting URL</span>
        <input
          type="url"
          className="gh-input font-mono text-[12px]"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder="https://meet.google.com/abc-defg-hij"
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

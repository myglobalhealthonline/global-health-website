"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Route, Save, Video } from "lucide-react";

export type AppointmentActionsCopy = {
  statusCreated: string;
  statusSent: string;
  statusContacted: string;
  statusConcluded: string;
  statusCancelled: string;
  modeOnline: string;
  modeInPerson: string;
  controlsTitle: string;
  controlsDesc: string;
  slotLabel: string;
  deliveryLabel: string;
  meetingUrlLabel: string;
  meetingUrlPlaceholderInPerson: string;
  meetingUrlPlaceholderOnline: string;
  meetingUrlHint: string;
  statusFieldLabel: string;
  testLink: string;
  save: string;
  saving: string;
  nothingToChange: string;
  saved: string;
  couldNotSave: string;
};

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
  copy,
}: {
  appointmentId: string;
  initialMeetingUrl: string | null;
  initialStatus: string;
  initialScheduledAt: string | null;
  initialMode: "ONLINE" | "IN_PERSON";
  copy: AppointmentActionsCopy;
}) {
  const STATUS_OPTIONS = [
    { value: "REQUEST_RECEIVED", label: copy.statusCreated },
    { value: "UNDER_REVIEW", label: copy.statusSent },
    { value: "CONTACTED", label: copy.statusContacted },
    { value: "COMPLETED", label: copy.statusConcluded },
    { value: "CANCELLED", label: copy.statusCancelled },
  ];
  const MODE_OPTIONS = [
    { value: "ONLINE", label: copy.modeOnline },
    { value: "IN_PERSON", label: copy.modeInPerson },
  ];
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
      setMessage({ kind: "error", text: copy.nothingToChange });
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
        setMessage({ kind: "error", text: json.message ?? copy.couldNotSave });
        return;
      }
      setMessage({ kind: "success", text: copy.saved });
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="mt-3 grid gap-4 rounded-lg border border-[var(--portal-line)] bg-white/75 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--portal-line)] pb-3">
        <div>
          <p className="text-portal-meta font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
            {copy.controlsTitle}
          </p>
          <p className="mt-1 text-sm text-[var(--portal-muted)]">
            {copy.controlsDesc}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--portal-well)] px-2.5 py-1 text-portal-thead font-bold text-[var(--portal-primary)]">
          <Route className="size-3" aria-hidden />
          {STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" /> {copy.slotLabel}
          </span>
          <input
            type="datetime-local"
            className="gh-input"
            value={scheduledAtLocal}
            onChange={(e) => setScheduledAtLocal(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">{copy.deliveryLabel}</span>
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
        <span className="gh-field-label">{copy.meetingUrlLabel}</span>
        <input
          type="url"
          className="gh-input font-mono text-portal-meta"
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder={
            mode === "IN_PERSON"
              ? copy.meetingUrlPlaceholderInPerson
              : copy.meetingUrlPlaceholderOnline
          }
          maxLength={500}
        />
        <span className="text-[11.5px] text-[var(--portal-muted)]">
          {copy.meetingUrlHint}
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">{copy.statusFieldLabel}</span>
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

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[var(--portal-well)] px-3 py-2">
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-portal-label font-semibold text-[var(--portal-primary)] hover:underline"
          >
            <Video className="size-3.5" /> {copy.testLink}
          </a>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending}
          className="gh-btn gh-btn-primary"
        >
          <Save className="size-3.5" /> {pending ? copy.saving : copy.save}
        </button>
      </div>
    </form>
  );
}

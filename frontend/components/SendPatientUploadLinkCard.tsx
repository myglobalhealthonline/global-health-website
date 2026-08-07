"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, Mail, MessageCircle } from "lucide-react";

/**
 * "Send the patient an upload link" action, shared by the doctor
 * appointment Documents tab and the admin appointment page.
 *
 * The two portals hit different endpoints (different auth gates, same
 * behaviour), so the caller passes `endpoint`. Whatever the patient uploads
 * through the link lands in the same AppointmentDocument table the doctor's
 * "Uploaded files" section already reads — no separate inbox.
 */
export type SendPatientUploadLinkCopy = {
  title: string;
  description: string;
  sendWhatsapp: string;
  sendEmail: string;
  send: string;
  sending: string;
  copyLink: string;
  copied: string;
  sentWhatsapp: string;
  sentEmail: string;
  failedWhatsapp: string;
  failedEmail: string;
  noPhone: string;
  failed: string;
  pickChannel: string;
  expiresAt: string;
};

export const DEFAULT_SEND_PATIENT_UPLOAD_LINK_COPY: SendPatientUploadLinkCopy = {
  title: "Send upload link to patient",
  description:
    "Generates a secure link the patient can use to upload files straight into this appointment. Sending again replaces it — any link already out stops working, so pick every channel you want before sending.",
  sendWhatsapp: "WhatsApp",
  sendEmail: "Email",
  send: "Send",
  sending: "Sending…",
  copyLink: "Copy link",
  copied: "Link copied",
  sentWhatsapp: "Upload link sent by WhatsApp.",
  sentEmail: "Upload link sent by email.",
  failedWhatsapp: "WhatsApp delivery failed.",
  failedEmail: "Email delivery failed.",
  noPhone: "No phone number on this appointment — WhatsApp could not be used.",
  failed: "Could not send the upload link.",
  pickChannel: "Pick at least one channel.",
  expiresAt: "Link expires {date}",
};

type SendResponse = {
  ok?: boolean;
  message?: string;
  data?: {
    link?: string;
    expiresAt?: string;
    sent?: string[];
    failed?: string[];
    missingPhone?: boolean;
  };
};

export function SendPatientUploadLinkCard({
  endpoint,
  copy = DEFAULT_SEND_PATIENT_UPLOAD_LINK_COPY,
  className,
}: {
  /** POST target, e.g. `/api/doctor/appointments/<id>/upload-link`. */
  endpoint: string;
  copy?: SendPatientUploadLinkCopy;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Both channels selected by default — a single send mints one token and
  // delivers it everywhere at once. Picking channels separately used to mint
  // (and silently revoke the prior) token per click, so a WhatsApp send
  // followed by an email send left the patient's WhatsApp link dead.
  const [channels, setChannels] = useState<Record<"email" | "whatsapp", boolean>>({
    email: true,
    whatsapp: true,
  });

  function toggleChannel(channel: "email" | "whatsapp") {
    setChannels((prev) => ({ ...prev, [channel]: !prev[channel] }));
  }

  function send() {
    const selected = (Object.keys(channels) as Array<"email" | "whatsapp">).filter(
      (c) => channels[c],
    );
    if (!selected.length) {
      setError(copy.pickChannel);
      return;
    }
    setError(null);
    setNotes([]);
    setCopied(false);
    startTransition(async () => {
      let data: NonNullable<SendResponse["data"]>;
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ channels: selected }),
        });
        const json = (await res.json().catch(() => ({}))) as SendResponse;
        if (!res.ok || !json.ok || !json.data?.link) {
          setError(json.message ?? copy.failed);
          return;
        }
        data = json.data;
      } catch {
        setError(copy.failed);
        return;
      }

      setLink(data.link ?? null);
      setExpiresAt(data.expiresAt ?? null);

      const next: string[] = [];
      if (data.sent?.includes("email")) next.push(copy.sentEmail);
      if (data.sent?.includes("whatsapp")) next.push(copy.sentWhatsapp);
      if (data.missingPhone) next.push(copy.noPhone);
      else if (data.failed?.includes("whatsapp")) next.push(copy.failedWhatsapp);
      if (data.failed?.includes("email")) next.push(copy.failedEmail);
      setNotes(next);
    });
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={`grid gap-3 rounded-lg border border-[var(--portal-line)] bg-white/75 p-3 shadow-sm ${className ?? ""}`}
    >
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--portal-well)] text-[var(--portal-primary)]">
          <Link2 className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--portal-text)]">{copy.title}</p>
          <p className="mt-1 text-portal-meta text-[var(--portal-muted)]">{copy.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-[var(--portal-text)]">
          <input
            type="checkbox"
            checked={channels.whatsapp}
            disabled={pending}
            onChange={() => toggleChannel("whatsapp")}
          />
          <MessageCircle className="size-3.5" aria-hidden />
          {copy.sendWhatsapp}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-[var(--portal-text)]">
          <input
            type="checkbox"
            checked={channels.email}
            disabled={pending}
            onChange={() => toggleChannel("email")}
          />
          <Mail className="size-3.5" aria-hidden />
          {copy.sendEmail}
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={() => send()}
          className="gh-btn gh-btn-primary text-sm"
        >
          {pending ? copy.sending : copy.send}
        </button>
        {link ? (
          <button
            type="button"
            onClick={copyLink}
            className="gh-btn gh-btn-ghost text-sm"
          >
            <Copy className="size-3.5" aria-hidden />
            {copied ? copy.copied : copy.copyLink}
          </button>
        ) : null}
      </div>

      {notes.length ? (
        <ul className="grid gap-1 text-portal-meta text-[var(--portal-muted)]">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {expiresAt ? (
        <p className="text-portal-meta text-[var(--portal-muted)]">
          {copy.expiresAt.replace(
            "{date}",
            new Date(expiresAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
          )}
        </p>
      ) : null}

      {error ? (
        <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">{error}</p>
      ) : null}
    </div>
  );
}

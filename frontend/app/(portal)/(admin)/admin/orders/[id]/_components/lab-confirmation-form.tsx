"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Send } from "lucide-react";

type Props = {
  appointmentId: string;
  labReference: string | null;
  labConfirmationSentAt: string | null;
};

/**
 * Admin panel for a test-centre booking.
 *
 * The booking is replicated by hand in the laboratory's own system, so this is
 * where whatever reference that system gives back is recorded, and where the
 * patient is told the appointment is really booked.
 *
 * Save and send are separate, for the same reason they are on a kit's tracking
 * code: a reference pasted from another tab is worth checking before it reaches
 * the patient. Sending works with no reference at all — plenty of labs give
 * none, and a confirmation naming the date, the centre and the address is the
 * point of the message.
 */
export function LabConfirmationForm({
  appointmentId,
  labReference,
  labConfirmationSentAt,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reference, setReference] = useState(labReference ?? "");

  async function save(): Promise<boolean> {
    const res = await fetch(`/api/admin/appointments/${appointmentId}/lab-reference`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ labReference: reference.trim() || null }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setError(json?.message ?? "Failed to save the lab reference");
      return false;
    }
    return true;
  }

  function onSave() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      if (await save()) {
        setNotice("Reference saved. The patient has not been told yet.");
        router.refresh();
      }
    });
  }

  function onSaveAndSend() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      // Save first: the send reads the column, so notifying without saving
      // would use the pre-edit value.
      if (!(await save())) return;
      const res = await fetch(`/api/admin/appointments/${appointmentId}/send-confirmation`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Saved, but the patient could not be notified");
        router.refresh();
        return;
      }
      const sent = [
        json.data?.emailSent ? "email" : null,
        json.data?.whatsappSent ? "WhatsApp" : null,
      ].filter(Boolean);
      const notes: string[] = Array.isArray(json.data?.notes) ? json.data.notes : [];
      setNotice(`Sent by ${sent.join(" and ")}.${notes.length > 0 ? ` ${notes.join(" ")}` : ""}`);
      router.refresh();
    });
  }

  const sentLabel = labConfirmationSentAt
    ? `Last sent to the patient ${new Date(labConfirmationSentAt).toLocaleString()}`
    : "Not yet sent to the patient";

  return (
    <div className="grid gap-3 p-5 text-sm">
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">
          Lab booking reference
        </span>
        <input
          className="gh-input"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Reference from the lab's system (optional)"
          maxLength={120}
        />
      </label>
      <p className="text-xs text-[var(--color-text-muted)]">{sentLabel}</p>
      {error ? <p className="text-portal-thead text-rose-700">{error}</p> : null}
      {notice ? <p className="text-portal-thead text-emerald-800">{notice}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
          Save reference
        </button>
        <button
          type="button"
          onClick={onSaveAndSend}
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
          {labConfirmationSentAt ? "Save & re-send confirmation" : "Save & send confirmation"}
        </button>
      </div>
    </div>
  );
}

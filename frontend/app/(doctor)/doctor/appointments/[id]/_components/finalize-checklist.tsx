"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

export function FinalizeChecklist({
  appointmentId,
  initialFinalized,
  initialNotesUploaded,
  initialFilesUploaded,
}: {
  appointmentId: string;
  initialFinalized: boolean;
  initialNotesUploaded: boolean;
  initialFilesUploaded: boolean;
}) {
  const router = useRouter();
  const [notesUploaded, setNotesUploaded] = useState(initialNotesUploaded);
  const [filesUploaded, setFilesUploaded] = useState(initialFilesUploaded);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (initialFinalized) {
    return (
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm font-semibold text-emerald-800">
        <p className="flex items-center gap-2">
          <CheckCircle2 className="size-4" aria-hidden />
          Appointment finalized
        </p>
        <p className="mt-1 text-[12px] font-medium text-emerald-700">
          Notes and required documents were confirmed for this consultation.
        </p>
      </div>
    );
  }

  function finalize() {
    setMessage(null);
    if (!notesUploaded || !filesUploaded) {
      setMessage("Confirm both checklist items before finalizing.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/finalize`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ notesUploaded: true, filesUploaded: true }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setMessage(json.message ?? "Could not finalize");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-[var(--portal-line)] bg-white/75 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--portal-primary)] text-white">
          <ClipboardCheck className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--portal-text)]">
            Final consultation checklist
          </p>
          <p className="mt-1 text-[12px] text-[var(--portal-muted)]">
            Confirm clinical notes and files before closing the appointment.
          </p>
        </div>
      </div>
      <label className="flex items-center gap-2 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={notesUploaded}
          onChange={(e) => setNotesUploaded(e.target.checked)}
        />
        Consultation notes uploaded / complete
      </label>
      <label className="flex items-center gap-2 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={filesUploaded}
          onChange={(e) => setFilesUploaded(e.target.checked)}
        />
        Required files uploaded
      </label>
      {message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={finalize}
        className="gh-btn gh-btn-primary text-sm"
      >
        {pending ? "Finalizing…" : "Finalize appointment"}
      </button>
    </div>
  );
}

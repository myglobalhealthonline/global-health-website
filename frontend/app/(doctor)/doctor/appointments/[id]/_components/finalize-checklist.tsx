"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

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
      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
        <CheckCircle2 className="size-4" aria-hidden />
        Appointment finalized
      </p>
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
    <div className="mt-3 space-y-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={notesUploaded}
          onChange={(e) => setNotesUploaded(e.target.checked)}
        />
        Consultation notes uploaded / complete
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filesUploaded}
          onChange={(e) => setFilesUploaded(e.target.checked)}
        />
        Required files uploaded
      </label>
      {message ? <p className="text-sm text-red-700">{message}</p> : null}
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

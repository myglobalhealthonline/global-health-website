"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppointmentStatusAction } from "../../actions";

export function StatusActions({
  appointmentId,
  allowed,
}: {
  appointmentId: string;
  allowed: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(status: string) {
    const form = new FormData();
    form.set("id", appointmentId);
    form.set("status", status);
    setError(null);
    startTransition(async () => {
      const result = await updateAppointmentStatusAction(form);
      if (result && result.ok === false) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {allowed.map((s) => (
        <button
          key={s}
          type="button"
          disabled={isPending}
          onClick={() => submit(s)}
          className={`gh-btn text-sm ${s === "CANCELLED" ? "gh-btn-danger" : "gh-btn-primary"}`}
        >
          Mark as {s.toLowerCase()}
        </button>
      ))}
      {error ? <p className="gh-status-error rounded-md px-3 py-2 text-sm">{error}</p> : null}
    </div>
  );
}

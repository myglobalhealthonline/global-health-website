"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { formatAppDate } from "@/lib/format-datetime";

export function ConfidentialityForm({
  accepted,
  acceptedAt,
  agreementText,
}: {
  accepted: boolean;
  acceptedAt: string | null;
  agreementText: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justAccepted, setJustAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAccepted = accepted || justAccepted;

  async function onAccept() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/doctor/confidentiality-agreement", { method: "POST" });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Could not record your acceptance. Please try again.");
      } else {
        setJustAccepted(true);
        // Refresh server components so the compliance banner drops the item.
        router.refresh();
      }
    } catch {
      setError("Backend is unavailable. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="gh-card p-6">
      {isAccepted ? (
        <p className="flex items-start gap-2 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            You accepted the current confidentiality agreement
            {acceptedAt ? ` on ${formatAppDate(acceptedAt)}` : justAccepted ? " just now" : ""}.
            No further action is needed.
          </span>
        </p>
      ) : null}

      <div className="mt-4 max-h-[26rem] overflow-y-auto whitespace-pre-wrap rounded-[var(--radius-card-sm)] border border-[var(--portal-line)] bg-[var(--portal-well)] p-4 text-sm leading-6 text-[var(--portal-ink)] first:mt-0">
        {agreementText}
      </div>

      {!isAccepted ? (
        <div className="mt-5">
          <label className="flex items-start gap-2.5 text-sm text-[var(--portal-ink)]">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-emerald-700"
            />
            <span>I have read and agree to the confidentiality agreement above.</span>
          </label>

          {error ? (
            <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void onAccept()}
            disabled={!checked || submitting}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Recording…" : "Accept agreement"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

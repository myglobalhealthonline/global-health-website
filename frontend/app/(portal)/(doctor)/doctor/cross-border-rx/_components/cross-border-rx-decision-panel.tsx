"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, MessageCircleQuestion, X } from "lucide-react";

export type CrossBorderRxInboxCopy = {
  fromLabel: string;
  statusAwaiting: string;
  statusMoreInfo: string;
  openConsultation: string;
  accept: string;
  requestInfo: string;
  refuse: string;
  messageLabel: string;
  messagePlaceholder: string;
  acceptHint: string;
  refuseHint: string;
  messageRequired: string;
  submit: string;
  submitting: string;
  couldNotSubmit: string;
};

type Decision = "ACCEPT" | "MORE_INFO" | "REFUSE";

export function CrossBorderRxDecisionPanel({
  requestId,
  asyncAppointmentId,
  copy,
}: {
  requestId: string;
  asyncAppointmentId: string | null;
  copy: CrossBorderRxInboxCopy;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Decision | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send(decision: Decision) {
    setError(null);
    if (decision === "MORE_INFO" && !message.trim()) {
      setError(copy.messageRequired);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/doctor/cross-border-rx/${requestId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision,
          message: message.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? copy.couldNotSubmit);
        return;
      }
      setMode(null);
      setMessage("");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 border-t border-[var(--portal-line)] pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {asyncAppointmentId ? (
          <Link
            href={`/doctor/appointments/${asyncAppointmentId}?tab=consultation`}
            className="gh-btn gh-btn-soft"
          >
            {copy.openConsultation}
          </Link>
        ) : null}
        <button
          type="button"
          className="gh-btn gh-btn-primary"
          disabled={pending}
          onClick={() => send("ACCEPT")}
          title={copy.acceptHint}
        >
          <Check className="size-3.5" /> {copy.accept}
        </button>
        <button
          type="button"
          className="gh-btn gh-btn-soft"
          disabled={pending}
          onClick={() => setMode(mode === "MORE_INFO" ? null : "MORE_INFO")}
        >
          <MessageCircleQuestion className="size-3.5" /> {copy.requestInfo}
        </button>
        <button
          type="button"
          className="gh-btn gh-btn-soft"
          disabled={pending}
          onClick={() => setMode(mode === "REFUSE" ? null : "REFUSE")}
          title={copy.refuseHint}
        >
          <X className="size-3.5" /> {copy.refuse}
        </button>
      </div>

      {mode ? (
        <div className="mt-2 grid gap-2">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{copy.messageLabel}</span>
            <textarea
              className="gh-input min-h-[4rem] resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={copy.messagePlaceholder}
              maxLength={5000}
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              className="gh-btn gh-btn-primary"
              disabled={pending}
              onClick={() => send(mode)}
            >
              {pending ? copy.submitting : copy.submit}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="gh-status-warning mt-2 rounded-md border px-3 py-2 text-portal-label">
          {error}
        </p>
      ) : null}
    </div>
  );
}

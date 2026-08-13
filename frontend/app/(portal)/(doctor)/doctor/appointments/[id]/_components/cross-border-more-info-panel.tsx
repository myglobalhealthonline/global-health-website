"use client";

import { useState, useTransition } from "react";
import { MessageCircleQuestion } from "lucide-react";
import type { CrossBorderRxPendingMoreInfoDto } from "@/lib/api/doctor-api";

export type CrossBorderMoreInfoCopy = {
  title: string;
  fromLabel: string;
  questionLabel: string;
  answerLabel: string;
  answerPlaceholder: string;
  submit: string;
  submitting: string;
  answerRequired: string;
  couldNotSubmit: string;
  answerSent: string;
  waitingForDoctor: string;
  yourAnswer: string;
};

/**
 * Doctor A's own appointment: shows Doctor B's pending "more information"
 * question (if any) right on the consultation tab — answered in-portal,
 * no separate link/page. Submitting attaches the answer to this
 * appointment's consultation notes and notifies Doctor B.
 */
export function CrossBorderMoreInfoPanel({
  appointmentId,
  initial,
  copy,
}: {
  appointmentId: string;
  initial: CrossBorderRxPendingMoreInfoDto;
  copy: CrossBorderMoreInfoCopy;
}) {
  const [answer, setAnswer] = useState("");
  const [answered, setAnswered] = useState(initial.answered);
  const [sentAnswer, setSentAnswer] = useState(initial.answer);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!answer.trim()) {
      setError(copy.answerRequired);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/doctor/appointments/${appointmentId}/cross-border-rx/more-info`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? copy.couldNotSubmit);
        return;
      }
      setSentAnswer(answer.trim());
      setAnswered(true);
    });
  }

  return (
    <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-center gap-2">
        <MessageCircleQuestion className="size-4 text-amber-700" aria-hidden />
        <p className="text-portal-compact font-bold text-amber-900">{copy.title}</p>
      </div>
      <p className="mt-1 text-portal-label text-amber-800">
        {copy.fromLabel}: {initial.targetDoctorName}
      </p>
      <p className="mt-2 rounded-md border border-[var(--portal-line)] bg-white p-3 text-portal-compact text-[var(--portal-text)]">
        {initial.question}
      </p>

      {answered ? (
        <div className="mt-3">
          <p className="gh-status-success rounded-md border px-3 py-2 text-portal-label">
            {copy.answerSent}
          </p>
          {sentAnswer ? (
            <p className="mt-2 text-portal-label text-[var(--portal-muted)]">
              {copy.yourAnswer}: {sentAnswer}
            </p>
          ) : null}
          <p className="mt-1 text-portal-label text-[var(--portal-muted)]">{copy.waitingForDoctor}</p>
        </div>
      ) : (
        <form className="mt-3 grid gap-2" onSubmit={submit}>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{copy.answerLabel}</span>
            <textarea
              className="gh-input min-h-[5rem] resize-y"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={copy.answerPlaceholder}
              maxLength={5000}
            />
          </label>
          {error ? (
            <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <button type="submit" className="gh-btn gh-btn-primary" disabled={pending}>
              {pending ? copy.submitting : copy.submit}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

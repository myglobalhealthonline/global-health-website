"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchCrossBorderRxMoreInfo,
  submitCrossBorderRxMoreInfoAnswer,
  type CrossBorderRxMoreInfoView,
} from "@/lib/api/public-api";

function CrossBorderMoreInfoForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [view, setView] = useState<CrossBorderRxMoreInfoView | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- token comes from the URL, only known post-mount
      setError("Invalid link.");
      return;
    }
    fetchCrossBorderRxMoreInfo(token).then((res) => {
      if (!res.ok) setError(res.message);
      else setView(res.data);
    });
  }, [token]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!answer.trim()) {
      setError("Enter an answer before sending.");
      return;
    }
    startTransition(async () => {
      const res = await submitCrossBorderRxMoreInfoAnswer(token, answer.trim());
      if (!res.ok) setError(res.message);
      else setSubmitted(true);
    });
  }

  if (error && !view) {
    return (
      <div className="gh-card mx-auto max-w-lg p-8">
        <p role="alert" className="gh-status-error rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
          {error}
        </p>
      </div>
    );
  }
  if (!view) {
    return <p className="text-center text-sm">Loading…</p>;
  }

  const answered = view.answered || submitted;

  return (
    <div className="gh-card mx-auto max-w-lg p-8">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
        More information requested
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        {view.targetDoctorName} needs more information about {view.patientFullName}&rsquo;s
        cross-border prescription request.
      </p>
      <p className="mt-4 rounded-[var(--radius-card-sm)] border-l-4 border-[var(--color-brand-primary)] bg-[var(--color-background-soft)] p-4 text-sm text-[var(--color-text-body)]">
        {view.question}
      </p>

      {answered ? (
        <p role="status" className="gh-status-success mt-6 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm font-semibold">
          {submitted
            ? "Your answer has been sent."
            : `Already answered: ${view.answer ?? ""}`}
        </p>
      ) : (
        <form className="mt-6" onSubmit={submit}>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Your answer
            </span>
            <textarea
              className="gh-input min-h-[8rem] resize-y rounded-[var(--radius-card-sm)] border border-[var(--color-border-strong)] p-3 text-sm"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={5000}
              required
            />
          </label>
          {error ? (
            <p role="alert" className="gh-status-error mt-3 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="gh2-btn-lime mt-4 w-full justify-center disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send answer"}
          </button>
        </form>
      )}
    </div>
  );
}

export function CrossBorderMoreInfoPageClient() {
  return (
    <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
      <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
        <CrossBorderMoreInfoForm />
      </Suspense>
    </section>
  );
}

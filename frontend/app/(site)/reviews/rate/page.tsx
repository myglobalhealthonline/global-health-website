"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { fetchReviewForm, submitReviewForm } from "@/lib/api/public-api";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";

const RATING_KEYS = [
  "overallSatisfaction",
  "doctorProfessionalism",
  "communicationClarity",
  "timelinessOfService",
  "valueForMoney",
  "likeliness",
  "bookingExperience",
] as const;

function ReviewRateForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [locale, setLocale] = useState<{
    title: string;
    intro: string;
    submit: string;
    thanks: string;
    labels: Record<string, string>;
  } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!token) {
      setError("Invalid review link.");
      return;
    }
    fetchReviewForm(token).then((res) => {
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setLocale(res.data.locale);
      if (res.data.submitted) setSubmitted(true);
    });
  }, [token]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const payload: Record<string, number> = {};
    for (const key of RATING_KEYS) {
      const v = ratings[key];
      if (!v || v < 1 || v > 5) {
        setError("Please rate every category (1–5).");
        return;
      }
      payload[key] = v;
    }
    startTransition(async () => {
      const res = await submitReviewForm(token, payload);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSubmitted(true);
    });
  }

  if (!locale && !error) {
    return <p className="text-center text-sm">Loading…</p>;
  }
  if (submitted && locale) {
    return (
      <div className="gh-card mx-auto max-w-lg p-8 text-center" role="status">
        <h1 className="text-xl font-bold">{locale.thanks}</h1>
      </div>
    );
  }

  return (
    <div className="gh-card mx-auto max-w-lg p-8">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{locale?.title}</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{locale?.intro}</p>
      {error ? (
        <p role="alert" className="gh-status-error mt-4 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {RATING_KEYS.map((key) => (
          <label key={key} className="block text-sm">
            <span className="font-semibold">{locale?.labels[key] ?? key}</span>
            <select
              className="gh-select mt-1 w-full"
              value={ratings[key] ?? ""}
              onChange={(e) =>
                setRatings((r) => ({ ...r, [key]: Number(e.target.value) }))
              }
              required
            >
              <option value="">Select…</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button type="submit" disabled={pending} className="gh2-btn-lime w-full justify-center disabled:opacity-60">
          {pending ? "Sending…" : locale?.submit}
        </button>
      </form>
    </div>
  );
}

export default function ReviewRatePage() {
  return (
    <>
    <GH2FlowHeader title="Rate your care" subtitle="Share feedback on your consultation experience." activeStep={1} steps={["Ratings", "Submit"]} />
    <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
      <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
        <ReviewRateForm />
      </Suspense>
    </section>
    </>
  );
}

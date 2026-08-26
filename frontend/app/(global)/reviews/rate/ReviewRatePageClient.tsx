"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { fetchReviewForm, submitReviewForm } from "@/lib/api/public-api";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import type { CommonLocale } from "@/lib/i18n/types";

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
    publicTitle: string;
    publicIntro: string;
    publicCta: string;
    labels: Record<string, string>;
  } | null>(null);
  const [destinations, setDestinations] = useState<Array<{
    provider: "GOOGLE" | "DOCTIFY" | "TRUSTPILOT";
    url: string;
  }>>([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- token comes from the URL, only known post-mount
      setError("Invalid review link.");
      return;
    }
    fetchReviewForm(token).then((res) => {
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setLocale(res.data.locale);
      setDestinations(res.data.destinations);
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
      <div className="gh-card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold" role="status">{locale.thanks}</h1>
        {destinations.length > 0 ? (
          <div className="mt-6 border-t border-[var(--color-border)] pt-6">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              {locale.publicTitle}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {locale.publicIntro}
            </p>
            <div className="mt-5 grid gap-3">
              {destinations.map((destination) => (
                <a
                  key={destination.provider}
                  href={destination.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gh2-btn-lime justify-center"
                >
                  {locale.publicCta} {destination.provider === "GOOGLE" ? "Google" : destination.provider === "DOCTIFY" ? "Doctify" : "Trustpilot"}
                </a>
              ))}
            </div>
          </div>
        ) : null}
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

export function ReviewRatePageClient({ flow }: { flow: CommonLocale["flow"] }) {
  return (
    <>
    <GH2FlowHeader
      title={flow.reviewRateTitle}
      subtitle={flow.reviewRateSubtitle}
      activeStep={1}
      steps={[flow.reviewRateStepRatings, flow.reviewRateStepSubmit]}
    />
    <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
      <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
        <ReviewRateForm />
      </Suspense>
    </section>
    </>
  );
}

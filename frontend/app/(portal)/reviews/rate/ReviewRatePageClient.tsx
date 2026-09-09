"use client";
import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { fetchReviewForm, submitReviewForm, performReviewAction, type ReviewFormData } from "@/lib/api/public-api";
import { getReviewCampaignCopy } from "@/lib/i18n/review-campaign-copy";
const RATING_KEYS = ["overallSatisfaction", "doctorProfessionalism", "communicationClarity", "timelinessOfService", "valueForMoney", "likeliness", "bookingExperience"] as const;
function ReviewRateForm({ language }: { language: string }) {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const campaign = params.get("campaign") ?? undefined;
  const [data, setData] = useState<ReviewFormData | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [retryUrl, setRetryUrl] = useState<string>();
  const copy = data?.copy ?? getReviewCampaignCopy(params.get("lang") ?? language);
  useEffect(() => {
    let active = true;
    fetchReviewForm(token, campaign).then((res) => {
      if (!active) return;
      if (!res.ok || !res.data.copy) setError(true);
      else setData(res.data);
    });
    return () => { active = false; };
  }, [token, campaign]);
  function act(action: "provider_opened" | "patient_reviewed" | "opted_out", provider?: "GOOGLE" | "DOCTIFY" | "TRUSTPILOT") {
    setError(false);
    startTransition(async () => {
      const res = await performReviewAction(token, action, provider, campaign);
      if (!res.ok) { setError(true); return; }
      setData((old) => old ? { ...old, stopped: true } : old);
      if (res.data.url) { setRetryUrl(res.data.url); window.open(res.data.url, "_blank", "noopener,noreferrer"); }
    });
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (RATING_KEYS.some((key) => !ratings[key] || ratings[key] < 1 || ratings[key] > 5)) return;
    setError(false);
    startTransition(async () => {
      const res = await submitReviewForm(token, ratings);
      if (!res.ok) { setError(true); return; }
      setData((old) => old ? { ...old, submitted: true } : old);
    });
  }
  return <main className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16" lang={data?.localeCode ?? params.get("lang") ?? language}>
    <div className="gh-card mx-auto max-w-lg p-8">
      <p className="mb-4 text-sm font-semibold">Global Health</p>
      <h1 className="text-2xl font-bold">{copy.title}</h1>
      {error && <p role="alert" className="gh-status-error mt-4 p-3">{data ? copy.error : copy.invalid}</p>}
      {!data && !error && <p role="status">{copy.loading}</p>}
      {data && <>
        <p className="mt-3 text-sm">{copy.intro}</p>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">{copy.privacy}</p>
        {data.stopped && <p className="mt-4" role="status">{copy.stopped}</p>}
        <div className="mt-6 grid gap-3">
          {data.destinations.map((d) => <button key={d.provider} disabled={pending} onClick={() => act("provider_opened", d.provider)} className="gh2-btn-lime justify-center disabled:opacity-60">{copy.cta} · {d.provider === "GOOGLE" ? "Google" : d.provider === "DOCTIFY" ? "Doctify" : "Trustpilot"}</button>)}
          {!data.destinations.length && <p>{copy.unavailable}</p>}
          {retryUrl && <a href={retryUrl} target="_blank" rel="noopener noreferrer" className="underline">{copy.retry}</a>}
          <button disabled={pending} onClick={() => act("patient_reviewed")} className="gh2-btn-outline justify-center">{copy.alreadyReviewed}</button>
          <button disabled={pending} onClick={() => act("opted_out")} className="underline">{copy.optOut}</button>
        </div>
        {!campaign && <details className="mt-8 border-t border-[var(--color-border)] pt-5">
          <summary className="cursor-pointer font-semibold">{copy.optionalFeedback}</summary>
          {data.submitted ? <p className="mt-4" role="status">{data.locale.thanks}</p> : <form className="mt-5 space-y-4" onSubmit={submit}>
            {RATING_KEYS.map((key) => <label key={key} className="block text-sm"><span>{data.locale.labels[key]}</span><select className="gh-select mt-1 w-full" value={ratings[key] ?? ""} onChange={(e) => setRatings((old) => ({ ...old, [key]: Number(e.target.value) }))} required><option value="">{copy.select}</option>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>)}
            <button type="submit" disabled={pending} className="gh2-btn-lime w-full justify-center">{pending ? copy.sending : data.locale.submit}</button>
          </form>}
        </details>}
      </>}
    </div>
  </main>;
}
export function ReviewRatePageClient({ language }: { language: string }) {
  return <Suspense fallback={<p>{getReviewCampaignCopy(language).loading}</p>}><ReviewRateForm language={language} /></Suspense>;
}

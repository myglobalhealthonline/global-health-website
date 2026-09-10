"use client";
import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { fetchReviewForm, performReviewAction, type ReviewFormData } from "@/lib/api/public-api";
import { getReviewCampaignCopy } from "@/lib/i18n/review-campaign-copy";
function ReviewRateForm({ language }: { language: string }) {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const campaign = params.get("campaign") ?? undefined;
  const [data, setData] = useState<ReviewFormData | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [retryUrl, setRetryUrl] = useState<string>();
  const copy = data?.copy ?? getReviewCampaignCopy(params.get("lang") ?? language);
  useEffect(() => {
    let active = true;
    fetchReviewForm(token, campaign).then((res) => {
      if (!active) return;
      if (!res.ok || !res.data.copy) setError(true);
      else { setError(false); setData(res.data); }
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [token, campaign]);
  function act(action: "provider_opened" | "patient_reviewed" | "opted_out", provider?: "GOOGLE" | "DOCTIFY" | "TRUSTPILOT") {
    setError(false);
    startTransition(async () => {
      const res = await performReviewAction(token, action, provider, campaign);
      if (!res.ok) { setError(true); return; }
      setData((old) => old ? { ...old, stopped: true } : old);
      // Same-tab navigation remains reliable after the request completes;
      // browsers can block window.open after an asynchronous action.
      if (res.data.url) { setRetryUrl(res.data.url); window.location.assign(res.data.url); }
    });
  }
  return <main className="min-h-svh bg-[var(--color-background-soft)] px-4 py-8 sm:py-16" lang={data?.localeCode ?? params.get("lang") ?? language}>
    <div className="mx-auto max-w-xl rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-background)] p-6 sm:p-12">
      <p className="mb-8 flex items-center gap-3 text-lg font-bold text-[var(--color-brand-primary)]"><span aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[var(--color-brand-primary)] text-3xl text-[var(--color-brand-accent)]">+</span>Global Health</p>
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-balance text-[var(--color-brand-primary)] sm:text-4xl">{copy.title}</h1>
      {error && <p role="alert" className="gh-status-error mt-4 p-3">{data ? copy.error : copy.invalid}</p>}
      {!data && !error && <p role="status">{copy.loading}</p>}
      {data && <>
        <p className="mt-4 text-base leading-relaxed">{copy.intro}</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{copy.privacy}</p>
        {data.stopped && <p className="mt-4" role="status">{copy.stopped}</p>}
        <div className="mt-6 grid gap-3">
          {data.destinations.map((d) => <button key={d.provider} disabled={pending} onClick={() => act("provider_opened", d.provider)} className="flex min-h-20 w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] px-5 py-4 text-left text-[var(--color-brand-primary)] transition-colors hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-primary)] disabled:cursor-wait disabled:opacity-60"><span><span className="block text-lg font-semibold">{d.provider === "GOOGLE" ? "Google" : d.provider === "DOCTIFY" ? "Doctify" : "Trustpilot"}</span><span className="mt-1 block text-sm text-[var(--color-text-muted)]">{copy.cta}</span></span><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-[var(--color-brand-accent)]">→</span></button>)}
          {!data.destinations.length && <p>{copy.unavailable}</p>}
          {retryUrl && <a href={retryUrl} target="_blank" rel="noopener noreferrer" className="underline">{copy.retry}</a>}
          <button disabled={pending} onClick={() => act("patient_reviewed")} className="mt-2 min-h-11 cursor-pointer text-sm text-[var(--color-brand-primary)] underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">{copy.alreadyReviewed}</button>
          <button disabled={pending} onClick={() => act("opted_out")} className="min-h-11 cursor-pointer text-sm text-[var(--color-brand-primary)] underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">{copy.optOut}</button>
        </div>
      </>}
    </div>
  </main>;
}
export function ReviewRatePageClient({ language }: { language: string }) {
  return <Suspense fallback={<p>{getReviewCampaignCopy(language).loading}</p>}><ReviewRateForm language={language} /></Suspense>;
}

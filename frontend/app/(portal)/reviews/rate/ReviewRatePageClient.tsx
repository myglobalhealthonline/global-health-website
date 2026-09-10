"use client";
import { Suspense, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import styles from "@/components/sections/CountryEntryGate.module.css";
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
    fetchReviewForm(token, campaign).then(async (res) => {
      if (!active) return;
      if (!res.ok || !res.data.copy) setError(true);
      else {
        setError(false); setData(res.data);
        if (res.data.destinations.length === 1) {
          const result = await performReviewAction(token, "provider_opened", res.data.destinations[0].provider, campaign);
          if (!active) return;
          if (!result.ok || !result.data.url) { setError(true); return; }
          setData(old => old ? { ...old, stopped: true } : old);
          setRetryUrl(result.data.url);
          window.location.replace(result.data.url);
        }
      }
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
  return <main className={`${styles.root} relative flex min-h-dvh flex-col overflow-x-hidden text-white`} lang={data?.localeCode ?? params.get("lang") ?? language}>
    <div aria-hidden="true" className={styles.backgroundLayer}>
      <Image src="/images/hero/country-entry-clinic-hero-2560.webp" alt="" fill sizes="100vw" className={styles.backgroundImage} priority />
    </div>
    <div aria-hidden="true" className={`${styles.tint} pointer-events-none fixed inset-0`} />
    <div aria-hidden="true" className={`${styles.pattern} pointer-events-none fixed inset-0`} />
    <header className={`${styles.header} relative flex justify-center`}>
      <a href="https://www.myglobalhealth.online/" className="gh-focus-on-dark inline-flex rounded-lg p-2" aria-label="Global Health homepage"><Image src="/logos/global-health-light.png" alt="Global Health" width={240} height={144} className="h-24 w-auto object-contain brightness-0 invert sm:h-28" priority /></a>
    </header>
    <section className={`${styles.body} relative flex flex-1 items-center`}>
      <div className={`${styles.content} w-full`}>
        <div className="mx-auto grid w-full max-w-xl gap-7 pb-12 pt-4 text-center sm:gap-9">
          <div className="min-w-0">
            <p className={styles.eyebrow}>Global Health</p>
            <h1 className="mt-4 text-balance text-4xl font-extrabold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl">{copy.title}</h1>
            {data && <p className="mx-auto mt-5 max-w-lg text-pretty text-base leading-relaxed text-white/75">{copy.intro}</p>}
          </div>
          <div className="gh-review-glass min-w-0 w-full rounded-[2rem]">
            <div className="p-6 sm:p-8">
              <h2 className={styles.selectTitle}>{copy.cta}</h2>
              {error && <p role="alert" className="mt-4 text-white">{data ? copy.error : copy.invalid}</p>}
              {!data && !error && <p role="status" className="mt-4 text-white/75">{copy.loading}</p>}
              {data && <>
                <p className="mx-auto mb-6 mt-3 max-w-sm text-sm leading-relaxed text-white/65">{copy.privacy}</p>
                {data.stopped && <p className="mb-5 text-sm text-[var(--color-brand-accent)]" role="status">{copy.stopped}</p>}
                <div className="grid gap-3">
                  {data.destinations.map(d => <button key={d.provider} disabled={pending} onClick={() => act("provider_opened", d.provider)} className={`group flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-left text-white transition-colors hover:border-[var(--color-brand-accent)] hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-brand-accent)] disabled:cursor-wait disabled:opacity-60`}>
                    <span className="text-base font-bold">{d.provider === "GOOGLE" ? "Google" : d.provider === "DOCTIFY" ? "Doctify" : "Trustpilot"}</span>
                    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-accent)] text-lg text-[var(--color-brand-primary)]">→</span>
                  </button>)}
                  {!data.destinations.length && <p className="text-white/75">{copy.unavailable}</p>}
                  {retryUrl && <a href={retryUrl} target="_blank" rel="noopener noreferrer" className="text-white underline">{copy.retry}</a>}
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 border-t border-white/15 pt-4">
                  <button disabled={pending} onClick={() => act("patient_reviewed")} className="gh-focus-on-dark min-h-11 cursor-pointer text-sm text-white/80 underline underline-offset-4 hover:text-white disabled:opacity-60">{copy.alreadyReviewed}</button>
                  <button disabled={pending} onClick={() => act("opted_out")} className="gh-focus-on-dark min-h-11 cursor-pointer text-sm text-white/80 underline underline-offset-4 hover:text-white disabled:opacity-60">{copy.optOut}</button>
                </div>
              </>}
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>;
}
export function ReviewRatePageClient({ language }: { language: string }) {
  return <Suspense fallback={<p>{getReviewCampaignCopy(language).loading}</p>}><ReviewRateForm language={language} /></Suspense>;
}

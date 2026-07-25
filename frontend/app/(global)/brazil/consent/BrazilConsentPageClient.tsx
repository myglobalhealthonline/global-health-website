"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import {
  fetchBrazilConsentForm,
  submitBrazilConsent,
} from "@/lib/api/public-api";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { PhoneField } from "@/components/forms/phone-field";
import type { loadLocaleBundle } from "@/lib/i18n/load-locale";

type BrazilConsentI18n = ReturnType<typeof loadLocaleBundle>["home"]["brazilConsent"];

function BrazilConsentForm({ t }: { t: BrazilConsentI18n }) {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId") ?? "";
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<{
    fullName: string;
    email: string;
    phone: string;
    pharmacy: string;
  } | null>(null);
  const [paid, setPaid] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!appointmentId || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- params come from the URL, only known post-mount
      setError(t.missingLinkError);
      setLoading(false);
      return;
    }
    fetchBrazilConsentForm(appointmentId, token).then((res) => {
      setLoading(false);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      if (res.data.submission?.paymentStatus === "PAID") {
        setPaid(true);
      }
      setPrefill({
        fullName: res.data.appointment.fullName,
        email: res.data.appointment.email,
        phone: res.data.appointment.phone ?? "",
        pharmacy: res.data.appointment.pharmacy ?? "",
      });
    });
  }, [appointmentId, token, t.missingLinkError]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await submitBrazilConsent({
        appointmentId,
        token,
        fullName: String(fd.get("fullName") ?? ""),
        email: String(fd.get("email") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        pharmacy: String(fd.get("pharmacy") ?? ""),
        message: String(fd.get("message") ?? ""),
        gdprConsent: true,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      if (res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      }
      setPaid(true);
    });
  }

  if (loading) {
    return <p className="text-center text-sm text-[var(--color-text-muted)]">{t.loading}</p>;
  }
  if (paid) {
    return (
      <div className="gh-card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          {t.thankYouTitle}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {t.consentRegisteredBody}
        </p>
      </div>
    );
  }

  return (
    <div className="gh-card mx-auto max-w-lg p-8">
      <p className="gh-eyebrow text-[var(--color-brand-primary)]">
        {t.eyebrow}
      </p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
        {t.formTitle}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        {t.formIntro}
      </p>
      {error ? (
        <p
          role="alert"
          className="
            mt-4 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm
            border border-[var(--color-status-error-border)]
            bg-[var(--color-status-error-bg)]
            text-[var(--color-status-error-text)]
          "
        >
          {error}
        </p>
      ) : null}
      {prefill ? (
        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <input type="hidden" name="gdprConsent" value="true" />
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            {t.fieldName}
            <input name="fullName" defaultValue={prefill.fullName} required className="gh-input" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            {t.fieldEmail}
            <input name="email" type="email" defaultValue={prefill.email} required className="gh-input" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            {t.fieldPhone}
            <PhoneField name="phone" defaultValue={prefill.phone} defaultDial="55" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            {t.fieldPharmacy}
            <input name="pharmacy" defaultValue={prefill.pharmacy} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            {t.fieldMessage}
            <textarea name="message" rows={3} className="gh-input" />
          </label>
          {/* Consent block is the legally-significant gate — surface it
            * inside its own panel above the submit button instead of as
            * a footnote checkbox the eye skims past. */}
          <label
            className="
              mt-2 flex items-start gap-3 text-sm
              rounded-[var(--radius-card-sm)] p-3
              border border-[var(--color-border)]
              bg-[var(--color-background-soft)]
              text-[var(--color-text-body)]
            "
          >
            <input
              type="checkbox"
              required
              defaultChecked
              className="mt-0.5 size-4 accent-[var(--color-brand-primary)]"
              aria-describedby="brazil-consent-text"
            />
            <span id="brazil-consent-text" className="leading-relaxed">
              {t.consentCheckboxText}
            </span>
          </label>
          <button type="submit" disabled={pending} className="gh2-btn-lime justify-center disabled:opacity-60">
            {pending ? t.submitting : t.submit}
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function BrazilConsentPageClient({ t }: { t: BrazilConsentI18n }) {
  return (
    <>
    <GH2FlowHeader title={t.headerTitle} subtitle={t.headerSubtitle} activeStep={1} steps={[t.stepConsent, t.stepPayment]} />
    <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
      <Suspense
        fallback={
          <p className="text-center text-sm text-[var(--color-text-muted)]">
            {t.loading}
          </p>
        }
      >
        <BrazilConsentForm t={t} />
      </Suspense>
    </section>
    </>
  );
}

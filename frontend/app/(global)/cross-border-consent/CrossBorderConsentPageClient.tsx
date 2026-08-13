"use client";

import {
  Suspense,
  useEffect,
  useState,
  useTransition,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import {
  fetchCrossBorderRxConsent,
  submitCrossBorderRxConsent,
  revertCrossBorderRxConsent,
  type CrossBorderRxConsentView,
} from "@/lib/api/public-api";
import { formatPrice } from "@/lib/format-currency";
import type enLegal from "@/locales/en/legal.json";

type Copy = typeof enLegal.crossBorderConsent;

const FOREST = "#1D4B36";

/** `{doctor}` / `{price}` / ... placeholder substitution — plain text only,
 *  no embedded markup, so every locale string stays a single translatable
 *  sentence instead of a template split across JSX. */
function fmt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <section
      className="flex min-h-[70vh] items-center justify-center px-4 py-12 sm:py-16"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, rgba(176,241,34,0.10) 0%, var(--color-background-soft) 45%)",
      }}
    >
      <div className="w-full max-w-2xl">{children}</div>
    </section>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface,#fff)] shadow-[0_18px_50px_rgba(4,32,24,0.12)]">
      <div
        aria-hidden
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${FOREST} 0%, #8FB021 55%, #B0F122 100%)` }}
      />
      <div className="p-6 sm:p-9">{children}</div>
    </div>
  );
}

function Eyebrow({ t }: { t: Copy }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
      {t.eyebrow}
    </p>
  );
}

function ConsentForm({ t }: { t: Copy }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [info, setInfo] = useState<CrossBorderRxConsentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [acting, setActing] = useState<"AGREE" | "DECLINE" | "REVERT" | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [gpBookingUrl, setGpBookingUrl] = useState<string | null>(null);
  // "choose" = the two options; "details" = the pre-filled pharmacy/address form
  // shown after Agree, before payment.
  const [step, setStep] = useState<"choose" | "details">("choose");
  const [form, setForm] = useState({
    pharmacyName: "",
    healthIdNumber: "",
    passportNumber: "",
    addressLine1: "",
    addressLine2: "",
    addressCity: "",
    addressPostalCode: "",
    addressCountryCode: "",
  });

  function loadConsent() {
    setLoading(true);
    fetchCrossBorderRxConsent(token).then((res) => {
      if (!res.ok) {
        setError(res.message);
      } else {
        setInfo(res.data);
        setError(null);
        setPaymentUrl(res.data.paymentUrl);
        setGpBookingUrl(res.data.gpBookingUrl);
        const p = res.data.prefill;
        setForm({
          pharmacyName: p.pharmacyName ?? "",
          healthIdNumber: p.healthIdNumber ?? "",
          passportNumber: p.passportNumber ?? "",
          addressLine1: p.addressLine1 ?? "",
          addressLine2: p.addressLine2 ?? "",
          addressCity: p.addressCity ?? "",
          addressPostalCode: p.addressPostalCode ?? "",
          addressCountryCode: p.addressCountryCode ?? "",
        });
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- token comes from the URL, only known post-mount
      setError("This consent link is invalid.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    loadConsent();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadConsent closes over `token` itself
  }, [token]);

  function decide(
    decision: "AGREE" | "DECLINE",
    details?: {
      pharmacyName: string;
      healthIdNumber: string;
      passportNumber: string;
      addressLine1: string;
      addressLine2: string;
      addressCity: string;
      addressPostalCode: string;
      addressCountryCode: string;
    },
  ) {
    setError(null);
    setActing(decision);
    startTransition(async () => {
      const res = await submitCrossBorderRxConsent(token, decision, details);
      if (!res.ok) {
        setError(res.message);
        setActing(null);
        return;
      }
      setInfo((prev) => (prev ? { ...prev, status: res.data.status } : prev));
      // Both choices take the patient straight to their next step.
      if (res.data.paymentUrl) {
        setPaymentUrl(res.data.paymentUrl);
        window.location.href = res.data.paymentUrl;
        return;
      }
      if (res.data.gpBookingUrl) {
        setGpBookingUrl(res.data.gpBookingUrl);
        window.location.href = res.data.gpBookingUrl;
        return;
      }
      setActing(null);
    });
  }

  function changeMind() {
    setError(null);
    setActing("REVERT");
    startTransition(async () => {
      const res = await revertCrossBorderRxConsent(token);
      if (!res.ok) {
        setError(res.message);
        setActing(null);
        return;
      }
      setStep("choose");
      loadConsent();
      setActing(null);
    });
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="size-7 animate-spin text-[var(--color-brand-primary)]" aria-hidden />
            <p className="text-sm text-[var(--color-text-muted)]">{t.loading}</p>
          </div>
        </Card>
      </Shell>
    );
  }

  // ── Invalid / expired link ───────────────────────────────────────────────
  if (error && !info) {
    return (
      <Shell>
        <Card>
          <Eyebrow t={t} />
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
            {t.errorTitle}
          </h1>
          <p role="alert" className="mt-3 rounded-xl bg-[var(--color-background-soft)] px-4 py-3 text-sm text-[var(--color-text-body)]">
            {error}
          </p>
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">{t.errorHint}</p>
        </Card>
      </Shell>
    );
  }

  if (!info) return null;

  const doctorB = info.targetDoctorName;
  // Names already include the doctor's title (e.g. "Dr", "MUDr.") — never prepend another.
  const doctorA = info.sourceDoctorName ?? t.defaultSourceDoctor;
  const busy = pending || acting !== null;
  const isIreland = info.targetCountryCode.trim().toLowerCase() === "ie";
  const postalCodeLabel = isIreland ? t.eircodeOptional : t.postalCode;
  const prescriptionFeeDisplay =
    info.prescriptionFeeCents != null
      ? formatPrice(info.prescriptionFeeCents, info.prescriptionFeeCurrency)
      : null;
  const gpConsultPriceDisplay =
    info.gpConsultPriceCents != null
      ? formatPrice(info.gpConsultPriceCents, info.gpConsultCurrency)
      : null;

  // ── Already agreed → resume payment ──────────────────────────────────────
  if (info.status === "PENDING_PAYMENT") {
    return (
      <Shell>
        <Card>
          <Eyebrow t={t} />
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
            {t.pendingPaymentTitle}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-body)]">
            {fmt(t.pendingPaymentBody, { doctor: doctorB })}
          </p>
          {error ? (
            <p role="alert" className="mt-4 rounded-xl bg-[rgba(200,40,40,0.08)] px-4 py-3 text-sm text-[#9b1c1c]">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {info.canChangeDecision ? (
              <button
                type="button"
                onClick={changeMind}
                disabled={busy}
                className="text-sm font-semibold text-[var(--color-text-muted)] disabled:opacity-60"
              >
                {t.changeMind}
              </button>
            ) : (
              <span />
            )}
            {paymentUrl ? (
              <a href={paymentUrl} className="gh2-btn-lime inline-flex items-center justify-center gap-2">
                {t.continueToPayment} <ArrowRight className="size-4" aria-hidden />
              </a>
            ) : null}
          </div>
        </Card>
      </Shell>
    );
  }

  // ── Declined → book GP ───────────────────────────────────────────────────
  if (info.status === "CONSENT_DECLINED") {
    return (
      <Shell>
        <Card>
          <Eyebrow t={t} />
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
            {t.declinedTitle}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-body)]">
            {fmt(t.declinedBody, { doctor: doctorB })}
          </p>
          {error ? (
            <p role="alert" className="mt-4 rounded-xl bg-[rgba(200,40,40,0.08)] px-4 py-3 text-sm text-[#9b1c1c]">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {info.canChangeDecision ? (
              <button
                type="button"
                onClick={changeMind}
                disabled={busy}
                className="text-sm font-semibold text-[var(--color-text-muted)] disabled:opacity-60"
              >
                {t.changeMind}
              </button>
            ) : (
              <span />
            )}
            {gpBookingUrl ? (
              <a href={gpBookingUrl} className="gh2-btn-lime inline-flex items-center justify-center gap-2">
                {t.bookConsultationCta} <ArrowRight className="size-4" aria-hidden />
              </a>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">{t.contactUsHint}</p>
            )}
          </div>
        </Card>
      </Shell>
    );
  }

  // ── Any other terminal state ─────────────────────────────────────────────
  if (info.status !== "PENDING_CONSENT") {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-9 text-[var(--color-brand-mint,#8FB021)]" aria-hidden />
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{t.handledTitle}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">{t.handledBody}</p>
          </div>
        </Card>
      </Shell>
    );
  }

  // ── Details step (after Agree, before payment) ───────────────────────────
  if (step === "details") {
    const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
    const field =
      "mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface,#fff)] px-3 py-2 text-sm text-[var(--color-text-primary)]";
    const label = "text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]";
    const needsIdentity = info.identityRequiresOneOf;
    const hasIdentity =
      !needsIdentity || form.healthIdNumber.trim().length > 0 || form.passportNumber.trim().length > 0;
    const canPay =
      form.pharmacyName.trim().length > 0 && form.addressLine1.trim().length > 0 && hasIdentity;
    return (
      <Shell>
        <Card>
          <Eyebrow t={t} />
          <h1 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
            {t.detailsTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
            {fmt(t.detailsIntro, { doctor: doctorB, idLabel: info.healthIdLabel })}
          </p>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className={label}>{t.pharmacyName}</span>
              <input
                className={field}
                value={form.pharmacyName}
                onChange={set("pharmacyName")}
                maxLength={200}
              />
            </label>
            <label className="block">
              <span className={label}>
                {fmt(needsIdentity ? t.idNumberLabelRequired : t.idNumberLabelOptional, {
                  label: info.healthIdLabel,
                  country: info.targetCountryName,
                })}
              </span>
              <input
                className={field}
                value={form.healthIdNumber}
                onChange={set("healthIdNumber")}
                maxLength={60}
                autoComplete="off"
              />
              <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                {fmt(needsIdentity ? t.idNumberHintRequired : t.idNumberHintOptional, {
                  label: info.healthIdLabel,
                  country: info.targetCountryName,
                })}
              </span>
            </label>
            {needsIdentity ? (
              <label className="block">
                <span className={label}>{t.passportNumber}</span>
                <input
                  className={field}
                  value={form.passportNumber}
                  onChange={set("passportNumber")}
                  maxLength={60}
                  autoComplete="off"
                />
                <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                  {fmt(t.passportHint, { label: info.healthIdLabel })}
                </span>
              </label>
            ) : null}
            <label className="block">
              <span className={label}>{t.addressLine1}</span>
              <input className={field} value={form.addressLine1} onChange={set("addressLine1")} maxLength={300} />
            </label>
            <label className="block">
              <span className={label}>{t.addressLine2}</span>
              <input className={field} value={form.addressLine2} onChange={set("addressLine2")} maxLength={300} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={label}>{t.city}</span>
                <input className={field} value={form.addressCity} onChange={set("addressCity")} maxLength={200} />
              </label>
              <label className="block">
                <span className={label}>{postalCodeLabel}</span>
                <input className={field} value={form.addressPostalCode} onChange={set("addressPostalCode")} maxLength={40} />
              </label>
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-4 rounded-xl bg-[rgba(200,40,40,0.08)] px-4 py-3 text-sm text-[#9b1c1c]">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep("choose")}
              disabled={busy}
              className="text-sm font-semibold text-[var(--color-text-muted)] disabled:opacity-60"
            >
              ← {t.back}
            </button>
            <button
              type="button"
              onClick={() => decide("AGREE", form)}
              disabled={busy || !canPay}
              className="gh2-btn-lime inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {acting === "AGREE" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> {t.pleaseWait}
                </>
              ) : (
                <>
                  {t.continueToPayment} <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </button>
          </div>
        </Card>
      </Shell>
    );
  }

  // ── Main consent view ────────────────────────────────────────────────────
  return (
    <Shell>
      <Card>
        {/* Header */}
        <div className="flex items-start gap-4">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-2xl"
            style={{ background: "var(--color-accent-soft, rgba(176,241,34,0.20))" }}
          >
            <ShieldCheck className="size-6" style={{ color: FOREST }} aria-hidden />
          </span>
          <div>
            <Eyebrow t={t} />
            <h1 className="mt-1 text-2xl font-bold leading-tight text-[var(--color-text-primary)]">
              {t.heading}
            </h1>
          </div>
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-body)]">
          {fmt(t.intro, { sourceDoctor: doctorA, targetDoctor: doctorB, country: info.targetCountryName })}
        </p>

        {/* What will be shared */}
        <div className="mt-5 flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
          <FileText className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-primary)]" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t.whatThisMeans}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-body)]">
              {fmt(t.whatThisMeansBody, { doctor: doctorB })}
            </p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-[rgba(200,40,40,0.08)] px-4 py-3 text-sm text-[#9b1c1c]">
            {error}
          </p>
        ) : null}

        {/* Two options */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Option A — share & pay */}
          <div className="flex flex-col rounded-2xl border border-[var(--color-border)] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                {t.optionAShareTitle}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
              {fmt(t.optionAShareBody, { doctor: doctorB })}
            </p>
            {prescriptionFeeDisplay ? (
              <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                {fmt(t.optionAPrice, { price: prescriptionFeeDisplay })}
              </p>
            ) : null}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep("details");
              }}
              disabled={busy}
              className="gh2-btn-lime mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
            >
              {t.agreeContinue} <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>

          {/* Option B — GP consult */}
          <div className="flex flex-col rounded-2xl border border-[var(--color-border)] p-5">
            <div className="flex items-center gap-2">
              <Stethoscope className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                {t.optionBTitle}
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
              {fmt(t.optionBBody, { doctor: doctorB })}
            </p>
            {gpConsultPriceDisplay ? (
              <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">
                {fmt(t.optionBPrice, { price: gpConsultPriceDisplay })}
              </p>
            ) : null}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => decide("DECLINE")}
              disabled={busy}
              className="gh2-btn-lime mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
            >
              {acting === "DECLINE" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> {t.pleaseWait}
                </>
              ) : (
                <>
                  <CalendarClock className="size-4" aria-hidden /> {t.bookGp}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Trust footer */}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Lock className="size-3.5" aria-hidden />
          {t.trustFooter}
        </p>
      </Card>
    </Shell>
  );
}

export function CrossBorderConsentPageClient({ t }: { t: Copy }) {
  return (
    <Suspense
      fallback={
        <Shell>
          <Card>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="size-7 animate-spin text-[var(--color-brand-primary)]" aria-hidden />
              <p className="text-sm text-[var(--color-text-muted)]">{t.loadingShort}</p>
            </div>
          </Card>
        </Shell>
      }
    >
      <ConsentForm t={t} />
    </Suspense>
  );
}

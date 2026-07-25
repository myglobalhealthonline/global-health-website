"use client";

import { Suspense, useEffect, useState, useTransition, type ReactNode } from "react";
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
  type CrossBorderRxConsentView,
} from "@/lib/api/public-api";

const FOREST = "#1D4B36";

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

function Eyebrow() {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
      Global Health · Secure request
    </p>
  );
}

function ConsentForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [info, setInfo] = useState<CrossBorderRxConsentView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [acting, setActing] = useState<"AGREE" | "DECLINE" | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [gpBookingUrl, setGpBookingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- token comes from the URL, only known post-mount
      setError("This consent link is invalid.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    fetchCrossBorderRxConsent(token).then((res) => {
      if (!res.ok) {
        setError(res.message);
      } else {
        setInfo(res.data);
        setPaymentUrl(res.data.paymentUrl);
        setGpBookingUrl(res.data.gpBookingUrl);
      }
      setLoading(false);
    });
  }, [token]);

  function decide(decision: "AGREE" | "DECLINE") {
    setError(null);
    setActing(decision);
    startTransition(async () => {
      const res = await submitCrossBorderRxConsent(token, decision);
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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="size-7 animate-spin text-[var(--color-brand-primary)]" aria-hidden />
            <p className="text-sm text-[var(--color-text-muted)]">Loading your request…</p>
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
          <Eyebrow />
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
            We couldn&rsquo;t open this request
          </h1>
          <p role="alert" className="mt-3 rounded-xl bg-[var(--color-background-soft)] px-4 py-3 text-sm text-[var(--color-text-body)]">
            {error}
          </p>
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            The link may have expired. Please ask your doctor to send a new one.
          </p>
        </Card>
      </Shell>
    );
  }

  if (!info) return null;

  const doctorB = info.targetDoctorName;
  const doctorA = info.sourceDoctorName ? `Dr. ${info.sourceDoctorName}` : "Your doctor";
  const busy = pending || acting !== null;

  // ── Already agreed → resume payment ──────────────────────────────────────
  if (info.status === "PENDING_PAYMENT") {
    return (
      <Shell>
        <Card>
          <Eyebrow />
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
            You&rsquo;re almost done
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-body)]">
            Thank you — you&rsquo;ve agreed to share your consultation notes with Dr. {doctorB}.
            Complete the payment to send your request.
          </p>
          {paymentUrl ? (
            <a href={paymentUrl} className="gh2-btn-lime mt-6 inline-flex w-full items-center justify-center gap-2 sm:w-auto">
              Continue to payment <ArrowRight className="size-4" aria-hidden />
            </a>
          ) : null}
        </Card>
      </Shell>
    );
  }

  // ── Declined → book GP ───────────────────────────────────────────────────
  if (info.status === "CONSENT_DECLINED") {
    return (
      <Shell>
        <Card>
          <Eyebrow />
          <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
            Book a full GP consultation
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-body)]">
            No problem — your record won&rsquo;t be shared. You can book a full consultation with
            Dr. {doctorB}. You&rsquo;ll choose a time and fill in a short form.
          </p>
          {gpBookingUrl ? (
            <a href={gpBookingUrl} className="gh2-btn-lime mt-6 inline-flex w-full items-center justify-center gap-2 sm:w-auto">
              Book a consultation <ArrowRight className="size-4" aria-hidden />
            </a>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">
              Please contact us to arrange your consultation.
            </p>
          )}
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
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              This request has already been handled
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">You can safely close this page.</p>
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
            <Eyebrow />
            <h1 className="mt-1 text-2xl font-bold leading-tight text-[var(--color-text-primary)]">
              Your prescription request
            </h1>
          </div>
        </div>

        <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-body)]">
          {doctorA} has asked <strong>Dr. {doctorB}</strong> in{" "}
          <strong>{info.targetCountryName}</strong> to issue a prescription for you.
        </p>

        {/* What will be shared */}
        <div className="mt-5 flex gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
          <FileText className="mt-0.5 size-5 shrink-0 text-[var(--color-brand-primary)]" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              What this means
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-body)]">
              To prescribe for you, Dr. {doctorB} needs to see your consultation notes. Choose an
              option below to continue.
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
          <div className="flex flex-col rounded-2xl border-2 border-[var(--color-brand-primary)] p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Share &amp; get your prescription
              </h2>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-text-body)]">
              Share your consultation notes with Dr. {doctorB} and pay the prescription fee.
            </p>
            <button
              type="button"
              onClick={() => decide("AGREE")}
              disabled={busy}
              className="gh2-btn-lime mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
            >
              {acting === "AGREE" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Please wait…
                </>
              ) : (
                <>
                  Agree &amp; continue <ArrowRight className="size-4" aria-hidden />
                </>
              )}
            </button>
          </div>

          {/* Option B — GP consult */}
          <div className="flex flex-col rounded-2xl border border-[var(--color-border)] p-5">
            <div className="flex items-center gap-2">
              <Stethoscope className="size-5 text-[var(--color-text-muted)]" aria-hidden />
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Prefer a full consultation?
              </h2>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-text-body)]">
              Don&rsquo;t share your notes — book a full GP consultation with Dr. {doctorB} instead.
            </p>
            <button
              type="button"
              onClick={() => decide("DECLINE")}
              disabled={busy}
              className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border-2 px-6 font-semibold transition-colors disabled:opacity-60"
              style={{ borderColor: FOREST, color: FOREST, background: "transparent" }}
            >
              {acting === "DECLINE" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Please wait…
                </>
              ) : (
                <>
                  <CalendarClock className="size-4" aria-hidden /> Book a GP consultation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Trust footer */}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Lock className="size-3.5" aria-hidden />
          Your information is encrypted and only shared with your consent.
        </p>
      </Card>
    </Shell>
  );
}

export function CrossBorderConsentPageClient() {
  return (
    <Suspense
      fallback={
        <Shell>
          <Card>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="size-7 animate-spin text-[var(--color-brand-primary)]" aria-hidden />
              <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
            </div>
          </Card>
        </Shell>
      }
    >
      <ConsentForm />
    </Suspense>
  );
}

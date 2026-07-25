"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchCrossBorderRxConsent,
  submitCrossBorderRxConsent,
  type CrossBorderRxConsentView,
} from "@/lib/api/public-api";

function ConsentForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [info, setInfo] = useState<CrossBorderRxConsentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The resolved next step after a decision (payment or GP booking link).
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [gpBookingUrl, setGpBookingUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- token comes from the URL, only known post-mount
      setError("Invalid consent link.");
      return;
    }
    fetchCrossBorderRxConsent(token).then((res) => {
      if (!res.ok) {
        setError(res.message);
      } else {
        setInfo(res.data);
        // Resume state for a link revisited after a decision.
        setPaymentUrl(res.data.paymentUrl);
        setGpBookingUrl(res.data.gpBookingUrl);
      }
    });
  }, [token]);

  function decide(decision: "AGREE" | "DECLINE") {
    setError(null);
    startTransition(async () => {
      const res = await submitCrossBorderRxConsent(token, decision);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setInfo((prev) => (prev ? { ...prev, status: res.data.status } : prev));
      if (res.data.paymentUrl) {
        setPaymentUrl(res.data.paymentUrl);
        // Consent given → send the patient straight to payment.
        window.location.href = res.data.paymentUrl;
        return;
      }
      if (res.data.gpBookingUrl) {
        setGpBookingUrl(res.data.gpBookingUrl);
      }
    });
  }

  if (error && !info) {
    return (
      <div className="gh-card mx-auto max-w-lg p-8">
        <p role="alert" className="gh-status-error rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
          {error}
        </p>
      </div>
    );
  }
  if (!info) {
    return <p className="text-center text-sm">Loading…</p>;
  }

  const decided = info.status !== "PENDING_CONSENT";

  return (
    <div className="gh-card mx-auto max-w-lg p-8">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
        Your prescription request
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        {info.sourceDoctorName ? `Dr. ${info.sourceDoctorName}` : "Your doctor"} has asked{" "}
        <strong>Dr. {info.targetDoctorName}</strong> in <strong>{info.targetCountryName}</strong> to
        issue a prescription for you.
      </p>
      <div className="mt-4 rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)] p-4 text-sm text-[var(--color-text-body)]">
        <p className="font-semibold text-[var(--color-text-primary)]">What this means</p>
        <p className="mt-1">
          To let Dr. {info.targetDoctorName} prescribe, your consultation notes (the record from
          your consultation) will be shared with them. If you agree, you&rsquo;ll pay the
          prescription fee and your request is sent to the doctor. If you&rsquo;d rather not share
          your record, you can instead book a full GP consultation with the same doctor.
        </p>
      </div>

      {error ? (
        <p role="alert" className="gh-status-error mt-3 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {/* Terminal / resume states */}
      {info.status === "PENDING_PAYMENT" ? (
        <div className="mt-6">
          <p className="text-sm text-[var(--color-text-body)]">
            Thank you — you&rsquo;ve agreed to share your record. Please complete the payment to send
            your request.
          </p>
          {paymentUrl ? (
            <a href={paymentUrl} className="gh2-btn-lime mt-4 inline-block">
              Continue to payment
            </a>
          ) : null}
        </div>
      ) : info.status === "CONSENT_DECLINED" ? (
        <div className="mt-6">
          <p className="text-sm text-[var(--color-text-body)]">
            No problem — your record won&rsquo;t be shared. You can book a full GP consultation with
            Dr. {info.targetDoctorName} instead. You&rsquo;ll choose a time slot and fill in a short
            form.
          </p>
          {gpBookingUrl ? (
            <a href={gpBookingUrl} className="gh2-btn-lime mt-4 inline-block">
              Book a GP consultation
            </a>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              Please contact us to arrange your consultation.
            </p>
          )}
        </div>
      ) : decided ? (
        <p role="status" className="gh-status-success mt-6 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm font-semibold">
          This request has already been processed. You can close this page.
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => decide("DECLINE")}
            disabled={pending}
            className="gh2-btn-ghost disabled:opacity-60"
          >
            Don&rsquo;t share — book a consultation
          </button>
          <button
            type="button"
            onClick={() => decide("AGREE")}
            disabled={pending}
            className="gh2-btn-lime disabled:opacity-60"
          >
            Agree &amp; continue to payment
          </button>
        </div>
      )}
    </div>
  );
}

export function CrossBorderConsentPageClient() {
  return (
    <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
      <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
        <ConsentForm />
      </Suspense>
    </section>
  );
}

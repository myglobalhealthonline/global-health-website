"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useTransition } from "react";
import {
  fetchBrazilConsentForm,
  submitBrazilConsent,
} from "@/lib/api/public-api";

function BrazilConsentForm() {
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
      setError("This consent link is missing or invalid. Please use the link from your email.");
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
  }, [appointmentId, token]);

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
    return <p className="text-center text-sm text-[var(--color-text-muted)]">Loading…</p>;
  }
  if (paid) {
    return (
      <div className="gh-card mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Obrigado
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          O seu consentimento foi registado. Pagamento confirmado.
        </p>
      </div>
    );
  }

  return (
    <div className="gh-card mx-auto max-w-lg p-8">
      <p className="gh-eyebrow text-[var(--color-brand-primary)]">
        Brasil · Consultoria
      </p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
        Consentimento médico
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Complete o formulário e proceda ao pagamento de processamento (€29).
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
            Nome
            <input name="fullName" defaultValue={prefill.fullName} required className="gh-input" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            Email
            <input name="email" type="email" defaultValue={prefill.email} required className="gh-input" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            Telefone
            <input name="phone" defaultValue={prefill.phone} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            Farmácia
            <input name="pharmacy" defaultValue={prefill.pharmacy} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            Mensagem
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
              Concordo com o tratamento dos meus dados de saúde para fins de
              consulta médica e processamento de pagamento.
            </span>
          </label>
          <button type="submit" disabled={pending} className="gh-btn gh-btn-primary">
            {pending ? "A processar…" : "Submeter e pagar"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

export default function BrazilConsentPage() {
  return (
    <main className="gh-section-tight mx-auto max-w-3xl px-4">
      <Suspense
        fallback={
          <p className="text-center text-sm text-[var(--color-text-muted)]">
            Loading…
          </p>
        }
      >
        <BrazilConsentForm />
      </Suspense>
    </main>
  );
}

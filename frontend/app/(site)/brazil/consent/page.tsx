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
    if (!appointmentId) {
      setError("Missing appointment reference.");
      setLoading(false);
      return;
    }
    fetchBrazilConsentForm(appointmentId).then((res) => {
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
  }, [appointmentId]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await submitBrazilConsent({
        appointmentId,
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
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
        Consentimento médico — Brasil
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Complete o formulário e proceda ao pagamento de processamento (€29).
      </p>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {prefill ? (
        <form className="mt-6 grid gap-3" onSubmit={submit}>
          <input type="hidden" name="gdprConsent" value="true" />
          <label className="flex flex-col gap-1 text-sm">
            Nome
            <input name="fullName" defaultValue={prefill.fullName} required className="gh-input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input name="email" type="email" defaultValue={prefill.email} required className="gh-input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Telefone
            <input name="phone" defaultValue={prefill.phone} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Farmácia
            <input name="pharmacy" defaultValue={prefill.pharmacy} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Mensagem
            <textarea name="message" rows={3} className="gh-input" />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required defaultChecked className="mt-1" />
            Concordo com o tratamento dos meus dados de saúde.
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
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
        <BrazilConsentForm />
      </Suspense>
    </main>
  );
}

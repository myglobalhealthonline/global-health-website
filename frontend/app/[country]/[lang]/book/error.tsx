"use client";

import { useParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

const COPY: Record<string, { title: string; body: string; retry: string }> = {
  en: { title: "Booking is temporarily unavailable", body: "Please try again. Your booking has not been submitted.", retry: "Try again" },
  de: { title: "Die Buchung ist vorübergehend nicht verfügbar", body: "Bitte versuchen Sie es erneut. Ihre Buchung wurde nicht übermittelt.", retry: "Erneut versuchen" },
  cs: { title: "Rezervace je dočasně nedostupná", body: "Zkuste to prosím znovu. Vaše rezervace nebyla odeslána.", retry: "Zkusit znovu" },
  pt: { title: "A marcação está temporariamente indisponível", body: "Tente novamente. A sua marcação não foi enviada.", retry: "Tentar novamente" },
  es: { title: "La reserva no está disponible temporalmente", body: "Inténtelo de nuevo. Su reserva no se ha enviado.", retry: "Intentar de nuevo" },
  ro: { title: "Programarea este temporar indisponibilă", body: "Încercați din nou. Programarea nu a fost trimisă.", retry: "Încercați din nou" },
};

export default function BookingError({ unstable_retry }: { unstable_retry: () => void }) {
  const { lang } = useParams<{ lang?: string }>();
  const [retrying, startRetry] = useTransition();
  const copy = COPY[lang ?? ""] ?? COPY.en;
  return (
    <section className="gh2-section-ivory py-[clamp(48px,6vw,88px)]">
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="gh2-status-card mx-auto max-w-[640px] text-center">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{copy.title}</h1>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">{copy.body}</p>
          <button type="button" disabled={retrying} aria-busy={retrying} onClick={() => {
            // Next refreshes server data and resets this boundary in the same
            // transition, preserving the booking URL and browser history.
            startRetry(unstable_retry);
          }} className="gh2-btn-lime mt-5 disabled:opacity-60">
            {retrying ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {copy.retry}
          </button>
        </div>
      </div>
    </section>
  );
}

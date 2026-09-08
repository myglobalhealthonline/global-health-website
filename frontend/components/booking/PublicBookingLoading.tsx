"use client";

import { useParams } from "next/navigation";

const COPY: Record<string, string> = {
  en: "Loading booking…",
  de: "Buchung wird geladen…",
  cs: "Načítání rezervace…",
  pt: "A carregar a marcação…",
  es: "Cargando la reserva…",
  ro: "Se încarcă programarea…",
};

export function PublicBookingLoading() {
  const { lang } = useParams<{ lang?: string }>();
  const label = COPY[lang ?? ""] ?? COPY.en;
  return (
    <section className="gh2-section-ivory py-[clamp(48px,6vw,88px)]" aria-busy="true">
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="gh2-status-card mx-auto max-w-[720px]">
          <div className="h-5 w-40 animate-pulse rounded bg-black/10" />
          <div className="mt-4 h-10 w-3/4 animate-pulse rounded bg-black/10" />
          <div className="mt-8 h-48 animate-pulse rounded-[var(--radius-card-sm)] bg-black/10" />
          <span className="sr-only" role="status">{label}</span>
        </div>
      </div>
    </section>
  );
}

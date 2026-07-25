"use client";

import { useEffect } from "react";
import { readClientLocale } from "@/lib/i18n/get-client-locale";

/**
 * Scoped error boundary for /doctor/reports that surfaces the real error
 * message + stack on-screen (temporary diagnostic — the shared doctor
 * boundary hides it behind a generic message).
 */
// ponytail: client-only error boundary can't call the async server locale
// bundle — small inline map per locale, same pattern as app/error.tsx.
// This is a diagnostic tool (message/digest/stack stay in English regardless
// of locale — they're for engineers, not patients), only the label + button
// are translated.
const T: Record<string, { label: string; tryAgain: string }> = {
  en: { label: "Reports page error (diagnostic)", tryAgain: "Try again" },
  pt: { label: "Erro na página de relatórios (diagnóstico)", tryAgain: "Tentar novamente" },
  es: { label: "Error en la página de informes (diagnóstico)", tryAgain: "Intentar de nuevo" },
  cs: { label: "Chyba stránky sestav (diagnostika)", tryAgain: "Zkusit znovu" },
  ro: { label: "Eroare pagina de rapoarte (diagnostic)", tryAgain: "Încearcă din nou" },
  de: { label: "Fehler auf der Berichtsseite (Diagnose)", tryAgain: "Erneut versuchen" },
};

export default function DoctorReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[doctor/reports] boundary:", error);
  }, [error]);

  const t = T[readClientLocale()] ?? T.en;

  return (
    <div className="p-6">
      <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
        <p className="font-bold">{t.label}</p>
        <p className="mt-2">
          <span className="font-semibold">message:</span> {error?.message || "(no message)"}
        </p>
        {error?.digest ? (
          <p className="mt-1">
            <span className="font-semibold">digest:</span> {error.digest}
          </p>
        ) : null}
        {error?.stack ? (
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white/60 p-2 text-portal-thead">
            {error.stack}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="gh-btn gh-btn-primary mt-3 text-sm"
        >
          {t.tryAgain}
        </button>
      </div>
    </div>
  );
}

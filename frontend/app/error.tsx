"use client";

import Link from "next/link";
import { useEffect } from "react";

const T: Record<string, { title: string; subtitle: string; tryAgain: string; backToHome: string }> = {
  en: { title: "Something went wrong", subtitle: "An unexpected error occurred. Please try again.", tryAgain: "Try again", backToHome: "Back to home" },
  pt: { title: "Algo correu mal", subtitle: "Ocorreu um erro inesperado. Por favor, tente novamente.", tryAgain: "Tentar novamente", backToHome: "Voltar ao início" },
  es: { title: "Algo salió mal", subtitle: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.", tryAgain: "Intentar de nuevo", backToHome: "Volver al inicio" },
  cs: { title: "Něco se pokazilo", subtitle: "Došlo k neočekávané chybě. Zkuste to prosím znovu.", tryAgain: "Zkusit znovu", backToHome: "Zpět na hlavní stránku" },
  ro: { title: "Ceva a mers greșit", subtitle: "A apărut o eroare neașteptată. Vă rugăm să încercați din nou.", tryAgain: "Încearcă din nou", backToHome: "Înapoi acasă" },
  de: { title: "Etwas ist schiefgelaufen", subtitle: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.", tryAgain: "Erneut versuchen", backToHome: "Zurück zur Startseite" },
};

function getClientLocale(): string {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|;\s*)gh_locale=([^;]+)/);
  return m?.[1] ?? "en";
}

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const t = T[getClientLocale()] ?? T.en;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{t.title}</h2>
      {/* Generic copy only — never render error.message (it can leak
          internal/back-end details). The real error is logged via
          console.error in the effect above. */}
      <p className="max-w-md text-sm text-[var(--color-text-muted)]">{t.subtitle}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="gh-btn gh-btn-primary"
        >
          {t.tryAgain}
        </button>
        <Link href="/" className="gh-btn gh-btn-outline">
          {t.backToHome}
        </Link>
      </div>
    </div>
  );
}

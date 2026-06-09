"use client";

import Link from "next/link";
import { useEffect } from "react";

const T: Record<string, { title: string; tryAgain: string; backToHome: string }> = {
  en: { title: "Something went wrong", tryAgain: "Try again", backToHome: "Back to home" },
  pt: { title: "Algo correu mal", tryAgain: "Tentar novamente", backToHome: "Voltar ao início" },
  es: { title: "Algo salió mal", tryAgain: "Intentar de nuevo", backToHome: "Volver al inicio" },
  cs: { title: "Něco se pokazilo", tryAgain: "Zkusit znovu", backToHome: "Zpět na hlavní stránku" },
  ro: { title: "Ceva a mers greșit", tryAgain: "Încearcă din nou", backToHome: "Înapoi acasă" },
  de: { title: "Etwas ist schiefgelaufen", tryAgain: "Erneut versuchen", backToHome: "Zurück zur Startseite" },
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
      <p className="max-w-md text-sm text-[var(--color-text-muted)]">{error.message}</p>
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

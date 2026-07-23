"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";

const T: Record<string, { title: string; subtitle: string; tryAgain: string; backToHome: string }> = {
  en: { title: "Something went wrong", subtitle: "An unexpected error occurred. Please try again.", tryAgain: "Try again", backToHome: "Back to home" },
  pt: { title: "Algo correu mal", subtitle: "Ocorreu um erro inesperado. Por favor, tente novamente.", tryAgain: "Tentar novamente", backToHome: "Voltar ao início" },
  es: { title: "Algo salió mal", subtitle: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.", tryAgain: "Intentar de nuevo", backToHome: "Volver al inicio" },
  cs: { title: "Něco se pokazilo", subtitle: "Došlo k neoÄekávané chybě. Zkuste to prosím znovu.", tryAgain: "Zkusit znovu", backToHome: "Zpět na hlavní stránku" },
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
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  const t = T[getClientLocale()] ?? T.en;

  return (
    <GH2StatusPage status="error" title={t.title} body={t.subtitle}>
      <button type="button" onClick={() => reset()} className="gh2-btn-lime">
        {t.tryAgain}
      </button>
      <Link
        href="/"
        className="rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-soft)]"
      >
        {t.backToHome}
      </Link>
    </GH2StatusPage>
  );
}

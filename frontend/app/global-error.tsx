"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import "./globals.css";

/**
 * Site-wide error boundary. Was `app/error.tsx`, which the multi-root-layout
 * split left homeless — with no `app/layout.tsx` there is no root layout for
 * a root-segment `error.tsx` to render inside, so this is the `global-error`
 * form, which owns its own `<html>`/`<body>`.
 *
 * Behaviour is unchanged from `app/error.tsx`: it sat ABOVE the `(site)`
 * layout, so an uncaught error already replaced the whole document including
 * the header/footer chrome. As the least-specific boundary it now also
 * catches failures inside the root layouts themselves, which the old file
 * could not.
 */
const T: Record<string, { title: string; subtitle: string; tryAgain: string; backToHome: string }> = {
  en: { title: "Something went wrong", subtitle: "An unexpected error occurred. Please try again.", tryAgain: "Try again", backToHome: "Back to home" },
  pt: { title: "Algo correu mal", subtitle: "Ocorreu um erro inesperado. Por favor, tente novamente.", tryAgain: "Tentar novamente", backToHome: "Voltar ao início" },
  es: { title: "Algo salió mal", subtitle: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.", tryAgain: "Intentar de nuevo", backToHome: "Volver al inicio" },
  cs: { title: "Něco se pokazilo", subtitle: "Došlo k neoÄekávané chybě. Zkuste to prosím znovu.", tryAgain: "Zkusit znovu", backToHome: "Zpět na hlavní stránku" },
  ro: { title: "Ceva a mers greșit", subtitle: "A apărut o eroare neașteptată. Vă rugăm să încercați din nou.", tryAgain: "Încearcă din nou", backToHome: "Înapoi acasă" },
  de: { title: "Etwas ist schiefgelaufen", subtitle: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.", tryAgain: "Erneut versuchen", backToHome: "Zurück zur Startseite" },
};

function getClientLocale(): string {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|;\s*)gh_locale=([^;]+)/);
  return m?.[1] ?? "en";
}

export default function GlobalErrorBoundary({
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

  // ponytail: lang stays "en" — the copy locale is read from a cookie on the
  // client only, so deriving the attribute from it would guarantee a
  // hydration mismatch on the one element that must not have suppressed
  // diffs sitewide.
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
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
      </body>
    </html>
  );
}

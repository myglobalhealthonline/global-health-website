"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";

const T: Record<string, { title: string; subtitle: string; tryAgain: string; backToHome: string }> = {
  en: { title: "Something went wrong", subtitle: "An unexpected error occurred. Please try again.", tryAgain: "Try again", backToHome: "Back to home" },
  pt: { title: "Algo correu mal", subtitle: "Ocorreu um erro inesperado. Por favor, tente novamente.", tryAgain: "Tentar novamente", backToHome: "Voltar ao inÃ­cio" },
  es: { title: "Algo saliÃ³ mal", subtitle: "OcurriÃ³ un error inesperado. Por favor, intÃ©ntalo de nuevo.", tryAgain: "Intentar de nuevo", backToHome: "Volver al inicio" },
  cs: { title: "NÄ›co se pokazilo", subtitle: "DoÅ¡lo k neoÄekÃ¡vanÃ© chybÄ›. Zkuste to prosÃ­m znovu.", tryAgain: "Zkusit znovu", backToHome: "ZpÄ›t na hlavnÃ­ strÃ¡nku" },
  ro: { title: "Ceva a mers greÈ™it", subtitle: "A apÄƒrut o eroare neaÈ™teptatÄƒ. VÄƒ rugÄƒm sÄƒ Ã®ncercaÈ›i din nou.", tryAgain: "ÃŽncearcÄƒ din nou", backToHome: "ÃŽnapoi acasÄƒ" },
  de: { title: "Etwas ist schiefgelaufen", subtitle: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.", tryAgain: "Erneut versuchen", backToHome: "ZurÃ¼ck zur Startseite" },
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

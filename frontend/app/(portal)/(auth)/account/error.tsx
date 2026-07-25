"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminEmptyState, Btn } from "@/components/portal-atoms";
import { readClientLocale } from "@/lib/i18n/get-client-locale";

// ponytail: client-only error boundary can't call the async server locale
// bundle — small inline map per locale, same pattern as app/error.tsx.
const T: Record<string, { title: string; description: string; tryAgain: string; contactSupport: string }> = {
  en: {
    title: "Something went wrong",
    description: "We couldn't load this page. Nothing you've done has been lost — try again, or contact us if it keeps happening.",
    tryAgain: "Try again",
    contactSupport: "Contact support",
  },
  pt: {
    title: "Algo correu mal",
    description: "Não foi possível carregar esta página. Nada do que fez foi perdido — tente novamente, ou contacte-nos se o problema persistir.",
    tryAgain: "Tentar novamente",
    contactSupport: "Contactar suporte",
  },
  es: {
    title: "Algo salió mal",
    description: "No pudimos cargar esta página. No se ha perdido nada de lo que hizo — inténtelo de nuevo, o contáctenos si sigue ocurriendo.",
    tryAgain: "Intentar de nuevo",
    contactSupport: "Contactar con soporte",
  },
  cs: {
    title: "Něco se pokazilo",
    description: "Tuto stránku se nepodařilo načíst. Nic z toho, co jste udělali, nebylo ztraceno — zkuste to znovu, nebo nás kontaktujte, pokud problém přetrvává.",
    tryAgain: "Zkusit znovu",
    contactSupport: "Kontaktovat podporu",
  },
  ro: {
    title: "Ceva a mers greșit",
    description: "Nu am putut încărca această pagină. Nimic din ce ați făcut nu s-a pierdut — încercați din nou sau contactați-ne dacă problema persistă.",
    tryAgain: "Încearcă din nou",
    contactSupport: "Contactează suportul",
  },
  de: {
    title: "Etwas ist schiefgelaufen",
    description: "Diese Seite konnte nicht geladen werden. Nichts, was Sie getan haben, ist verloren gegangen — versuchen Sie es erneut oder kontaktieren Sie uns, falls das Problem weiterhin besteht.",
    tryAgain: "Erneut versuchen",
    contactSupport: "Support kontaktieren",
  },
};

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const t = T[readClientLocale()] ?? T.en;

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <AdminEmptyState
        tone="danger"
        icon={<AlertTriangle className="size-5" aria-hidden />}
        title={t.title}
        description={t.description}
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Btn variant="primary" onClick={reset}>
              {t.tryAgain}
            </Btn>
            <Btn href="/contact" variant="secondary">
              {t.contactSupport}
            </Btn>
          </div>
        }
      />
    </div>
  );
}

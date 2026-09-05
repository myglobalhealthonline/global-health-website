"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminEmptyState, Btn } from "@/components/portal-atoms";
import { readClientLocale } from "@/lib/i18n/get-client-locale";
import { useErrorRetry } from "@/app/_components/error-recovery";

/**
 * Error boundary for the whole corporate route group. Without one, a failure
 * on any corporate page escaped to the root boundary and took the portal
 * chrome with it — a corporate admin lost the nav and had nothing to press
 * but the browser's reload.
 *
 * Same shape as the doctor and account boundaries, including the reason for
 * the inline copy map: a client boundary can't await the server locale
 * bundle.
 */
const T: Record<string, { title: string; description: string; tryAgain: string }> = {
  en: {
    title: "Something went wrong",
    description:
      "This page ran into a problem loading. Your company's employee records and requests are safe — try again, or come back to it in a moment.",
    tryAgain: "Try again",
  },
  pt: {
    title: "Algo correu mal",
    description:
      "Ocorreu um problema ao carregar esta página. Os registos de colaboradores e os pedidos da sua empresa estão seguros — tente novamente, ou volte dentro de instantes.",
    tryAgain: "Tentar novamente",
  },
  es: {
    title: "Algo salió mal",
    description:
      "Se produjo un problema al cargar esta página. Los registros de empleados y las solicitudes de su empresa están a salvo — inténtelo de nuevo, o vuelva dentro de un momento.",
    tryAgain: "Intentar de nuevo",
  },
  cs: {
    title: "Něco se pokazilo",
    description:
      "Při načítání této stránky došlo k problému. Záznamy zaměstnanců a žádosti vaší společnosti jsou v bezpečí — zkuste to znovu, nebo se vraťte za chvíli.",
    tryAgain: "Zkusit znovu",
  },
  ro: {
    title: "Ceva a mers greșit",
    description:
      "A apărut o problemă la încărcarea acestei pagini. Evidențele angajaților și solicitările companiei dumneavoastră sunt în siguranță — încercați din nou sau reveniți peste puțin timp.",
    tryAgain: "Încearcă din nou",
  },
  de: {
    title: "Etwas ist schiefgelaufen",
    description:
      "Beim Laden dieser Seite ist ein Problem aufgetreten. Die Mitarbeiterdaten und Anfragen Ihres Unternehmens sind sicher — versuchen Sie es erneut oder kommen Sie in einem Moment zurück.",
    tryAgain: "Erneut versuchen",
  },
};

export default function CorporateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const { retry, pending } = useErrorRetry(error, reset);
  const t = T[readClientLocale()] ?? T.en;

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <AdminEmptyState
        tone="danger"
        icon={<AlertTriangle className="size-5" aria-hidden />}
        title={t.title}
        description={t.description}
        action={
          <Btn variant="primary" onClick={retry} loading={pending}>
            {t.tryAgain}
          </Btn>
        }
      />
    </div>
  );
}

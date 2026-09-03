"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared recovery behaviour for every error boundary in the app.
 *
 * Why this exists: `reset()` on its own only re-renders the boundary's
 * children from the client's *cached* RSC payload. When the failure came
 * from the server render, that cached payload IS the error, so the same
 * error is thrown again immediately and "Try again" looks like a dead
 * button. `router.refresh()` is what discards the payload and refetches, so
 * the two have to fire together.
 */

/** Failures no re-render can survive, because the running bundle itself is
 *  broken: the browser is holding chunks the server no longer serves (a
 *  deploy landed under a tab that was left open). `reset()` and
 *  `router.refresh()` both re-run that same bundle, so only a full document
 *  reload recovers — which is also why the error survived navigating to
 *  another page. */
const BUNDLE_ERROR =
  /chunkload|loading chunk|loading css chunk|dynamically imported module|importing a module script failed/i;

export function isBundleError(error: Error): boolean {
  return BUNDLE_ERROR.test(`${error.name} ${error.message}`);
}

/** Attempt bookkeeping lives at module scope on purpose: Next REMOUNTS the
 *  error component after every `reset()`, so a `useRef` counter is back to
 *  zero by the time the same error lands again (verified against the dev
 *  server — a ref-based counter never escalated).
 *
 *  Deliberately just a timestamp, not an error fingerprint: the same
 *  underlying fault can surface with a different message each render (a
 *  page that fans out several fetches reports whichever rejected first), so
 *  matching on the error identity silently skipped the escalation. Two
 *  presses inside the window means the refresh didn't help, whatever the
 *  message said. The cost of a false positive is one extra page load. */
let lastRetryAt = 0;
const ESCALATE_WINDOW_MS = 30_000;

export function useErrorRetry(error: Error & { digest?: string }, reset: () => void) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const retry = useCallback(() => {
    // A refresh already failed, or the running bundle itself is broken —
    // escalate rather than leaving the user pressing a button that cannot
    // work.
    if (Date.now() - lastRetryAt < ESCALATE_WINDOW_MS || isBundleError(error)) {
      lastRetryAt = 0;
      window.location.reload();
      return;
    }
    lastRetryAt = Date.now();
    startTransition(() => {
      router.refresh();
      reset();
    });
  }, [error, reset, router]);

  return { retry, pending };
}

export type PublicErrorCopy = {
  title: string;
  subtitle: string;
  tryAgain: string;
  backToHome: string;
};

/** One copy of the public-facing error strings, shared by `global-error`
 *  and the two public route-group boundaries so they can't drift. */
const PUBLIC_ERROR_COPY: Record<string, PublicErrorCopy> = {
  en: { title: "Something went wrong", subtitle: "An unexpected error occurred. Please try again.", tryAgain: "Try again", backToHome: "Back to home" },
  pt: { title: "Algo correu mal", subtitle: "Ocorreu um erro inesperado. Por favor, tente novamente.", tryAgain: "Tentar novamente", backToHome: "Voltar ao início" },
  es: { title: "Algo salió mal", subtitle: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.", tryAgain: "Intentar de nuevo", backToHome: "Volver al inicio" },
  cs: { title: "Něco se pokazilo", subtitle: "Došlo k neočekávané chybě. Zkuste to prosím znovu.", tryAgain: "Zkusit znovu", backToHome: "Zpět na hlavní stránku" },
  ro: { title: "Ceva a mers greșit", subtitle: "A apărut o eroare neașteptată. Vă rugăm să încercați din nou.", tryAgain: "Încearcă din nou", backToHome: "Înapoi acasă" },
  de: { title: "Etwas ist schiefgelaufen", subtitle: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.", tryAgain: "Erneut versuchen", backToHome: "Zurück zur Startseite" },
};

/** Locale from the URL segment when the boundary has one, else the
 *  `gh_locale` cookie. Deliberately dependency-free: `global-error` renders
 *  outside every layout, so this must not drag in the i18n bundle. */
export function publicErrorCopy(locale?: string): PublicErrorCopy {
  if (locale && PUBLIC_ERROR_COPY[locale]) return PUBLIC_ERROR_COPY[locale];
  if (typeof document === "undefined") return PUBLIC_ERROR_COPY.en;
  const cookie = document.cookie.match(/(?:^|;\s*)gh_locale=([^;]+)/)?.[1];
  return (cookie && PUBLIC_ERROR_COPY[cookie]) || PUBLIC_ERROR_COPY.en;
}

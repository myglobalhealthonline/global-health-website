"use client";

import { useEffect } from "react";
import {
  GH2StatusMonitor,
  GH2StatusReference,
} from "@/components/sections/GH2StatusMonitor";
import { publicErrorCopy } from "./_components/error-recovery";
import "./globals.css";

/**
 * Site-wide error boundary. Was `app/error.tsx`, which the multi-root-layout
 * split left homeless — with no `app/layout.tsx` there is no root layout for
 * a root-segment `error.tsx` to render inside, so this is the `global-error`
 * form, which owns its own `<html>`/`<body>`.
 *
 * This is the LAST-RESORT boundary: reaching it means the whole document was
 * replaced, taking the app router with it. Two consequences drive the markup
 * below:
 *
 *  - `reset()` is not usable here. It re-renders a tree whose root layout is
 *    already gone, so it either throws straight back into this boundary or
 *    leaves a blank document — that is the "Try again does nothing" report.
 *    A full document reload is the only recovery, so that is what the button
 *    does.
 *  - `next/link` is not usable here either, for the same reason: there is no
 *    router to hand the navigation to. Plain `<a>` does a real navigation.
 *
 * The nearer boundaries (`[country]/[lang]`, `(global)`, and the portal
 * ones) render INSIDE their layout and keep the router alive, so they can
 * still refresh-and-reset — see `useErrorRetry`. Errors thrown by a root
 * layout itself have nowhere else to go and still land here.
 *
 * Same `GH2StatusMonitor` panel as the 404 and the nearer boundaries — this
 * one just has no site chrome around it.
 */
export default function GlobalErrorBoundary({
  error,
}: {
  error: Error & { digest?: string };
  /** Next always passes it; deliberately unused — see the note above. */
  reset: () => void;
}) {
  // Logged in production too. Nothing else records this: the failure is
  // client-side (a server render error would already be in the container
  // log), so suppressing it here left the crash with no trace anywhere.
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  const t = publicErrorCopy();

  // lang stays "en" — the accepted residual limitation of A11Y-001 (Batch 15,
  // 2026-09-06). Stated plainly, because it IS a defect and not a non-issue:
  // `publicErrorCopy()` above reads `gh_locale` from `document.cookie`, so a
  // Czech or German visitor gets Czech or German error copy inside an
  // `<html lang="en">` document — WCAG 2.2 §3.1.1 fails here, in the one place
  // the rest of that batch could not reach.
  //
  // It stays this way because every fix is worse than the defect. This is the
  // last-resort client boundary: the whole document was replaced, so there is
  // no server request context to read the language from, and the cookie is
  // only legible after the component is already running on the client. On the
  // SSR path (a root layout that threw) the server would emit "en" and the
  // client would then have to rewrite the attribute — post-hydration DOM
  // mutation on <html>, which is exactly the approach this batch rejected for
  // the portal. Trading a correct `lang` for a less reliable error boundary is
  // not a good trade on the screen a user reaches only when everything else
  // has already failed.
  //
  // Recorded in docs/plans/frontend-accessibility-backlog.md (A11Y-001).
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <GH2StatusMonitor
          eyebrow={t.eyebrow}
          monitorLabel={t.monitorLabel}
          code={t.code}
          signalLabel={t.signalLabel}
          title={t.title}
          body={t.subtitle}
          reference={error.digest ? <GH2StatusReference digest={error.digest} /> : undefined}
          actions={
            <>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="gh2-btn-lime"
              >
                {t.tryAgain}
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
                  global-error renders outside the router, so next/link has no
                  router to hand the navigation to. A real navigation is the
                  point here. */}
              <a href="/" className="gh2-btn-ghost">
                {t.backToHome}
              </a>
            </>
          }
        />
      </body>
    </html>
  );
}

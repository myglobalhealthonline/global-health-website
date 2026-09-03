"use client";

import { useEffect } from "react";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
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

  // ponytail: lang stays "en" — the copy locale is read from a cookie on the
  // client only, so deriving the attribute from it would guarantee a
  // hydration mismatch on the one element that must not have suppressed
  // diffs sitewide.
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <GH2StatusPage
          status="error"
          title={t.title}
          body={t.subtitle}
          reference={
            error.digest ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                Reference: <code>{error.digest}</code>
              </p>
            ) : undefined
          }
        >
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
          <a
            href="/"
            className="rounded-full border border-[var(--color-border)] px-5 py-3 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-soft)]"
          >
            {t.backToHome}
          </a>
        </GH2StatusPage>
      </body>
    </html>
  );
}

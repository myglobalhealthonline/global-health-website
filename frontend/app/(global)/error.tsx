"use client";

import { useEffect } from "react";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { publicErrorCopy, useErrorRetry } from "@/app/_components/error-recovery";

/**
 * Boundary for the locale-less public routes (/blog, /contact, /cart,
 * /checkout, /privacy, …). Same reason as the `[country]/[lang]` copy: these
 * pages previously escalated to `global-error`, which replaces the document
 * and takes the router with it. Locale comes from the `gh_locale` cookie
 * here — these routes carry no lang segment.
 */
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public]", error);
  }, [error]);

  const t = publicErrorCopy();
  const { retry, pending } = useErrorRetry(error, reset);

  return (
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
      <button type="button" onClick={retry} disabled={pending} className="gh2-btn-lime">
        {t.tryAgain}
      </button>
    </GH2StatusPage>
  );
}

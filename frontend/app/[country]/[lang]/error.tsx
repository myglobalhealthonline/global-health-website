"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { publicErrorCopy, useErrorRetry } from "@/app/_components/error-recovery";

/**
 * Public country/locale boundary.
 *
 * Without this file every public-page failure escalated to
 * `app/global-error.tsx`, which owns its own document — so one broken page
 * blew away the header, footer and the router with them. The visible symptom
 * was that the error survived everything the visitor tried next, including
 * switching country, because there was no longer a router to navigate with.
 * Rendering inside this layout keeps the site chrome and the router alive,
 * so navigation works and "Try again" can actually refetch.
 */
export default function CountryLangError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public]", error);
  }, [error]);

  const { lang } = useParams<{ lang?: string }>();
  const t = publicErrorCopy(lang);
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

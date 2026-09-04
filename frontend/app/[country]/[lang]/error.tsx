"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GH2StatusMonitor, GH2StatusReference } from "@/components/sections/GH2StatusMonitor";
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
 *
 * Presented on the same `GH2StatusMonitor` panel as the 404: to a visitor
 * these are the same situation with a different cause, and two unrelated
 * designs made the error read as the more broken of the two.
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

  const { country, lang } = useParams<{ country?: string; lang?: string }>();
  const t = publicErrorCopy(lang);
  const { retry, pending } = useErrorRetry(error, reset);
  const home = country && lang ? `/${country}/${lang}` : "/";

  return (
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
          <button type="button" onClick={retry} disabled={pending} className="gh2-btn-lime">
            {t.tryAgain}
          </button>
          <Link href={home} className="gh2-btn-ghost">
            {t.backToHome}
          </Link>
        </>
      }
    />
  );
}


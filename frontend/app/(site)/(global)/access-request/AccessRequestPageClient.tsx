"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchMedicalAccessRequest,
  respondToMedicalAccessRequest,
} from "@/lib/api/public-api";

function AccessRequestForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [info, setInfo] = useState<{
    doctorName: string;
    doctorCountry: string;
    reason: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<"APPROVE" | "DENY" | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- token comes from the URL, only known post-mount
      setError("Invalid access request link.");
      return;
    }
    fetchMedicalAccessRequest(token).then((res) => {
      if (!res.ok) setError(res.message);
      else setInfo(res.data);
    });
  }, [token]);

  function respond(next: "APPROVE" | "DENY") {
    setError(null);
    startTransition(async () => {
      const res = await respondToMedicalAccessRequest(token, next);
      if (!res.ok) setError(res.message);
      else setDecision(next);
    });
  }

  if (error && !info) {
    return (
      <div className="gh-card mx-auto max-w-lg p-8">
        <p role="alert" className="gh-status-error rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
          {error}
        </p>
      </div>
    );
  }
  if (!info) {
    return <p className="text-center text-sm">Loading…</p>;
  }

  return (
    <div className="gh-card mx-auto max-w-lg p-8">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
        Medical file access request
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Dr. {info.doctorName} ({info.doctorCountry}) is requesting access to your
        Global Health medical file.
      </p>
      <p className="mt-4 rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)] p-4 text-sm italic text-[var(--color-text-body)]">
        &ldquo;{info.reason}&rdquo;
      </p>

      {decision ? (
        <p role="status" className="gh-status-success mt-6 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm font-semibold">
          {decision === "APPROVE" ? "Access approved. Thank you." : "Access denied. Thank you."}
        </p>
      ) : (
        <>
          {error ? (
            <p role="alert" className="gh-status-error mt-3 rounded-[var(--radius-card-sm)] px-3 py-2 text-sm">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => respond("DENY")}
              disabled={pending}
              className="gh2-btn-ghost disabled:opacity-60"
            >
              Deny
            </button>
            <button
              type="button"
              onClick={() => respond("APPROVE")}
              disabled={pending}
              className="gh2-btn-lime disabled:opacity-60"
            >
              Approve
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AccessRequestPageClient() {
  return (
    <section className="bg-[var(--color-background-soft)] px-5 py-12 sm:py-16">
      <Suspense fallback={<p className="text-center text-sm">Loading…</p>}>
        <AccessRequestForm />
      </Suspense>
    </section>
  );
}

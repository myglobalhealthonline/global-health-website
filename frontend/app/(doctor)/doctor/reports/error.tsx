"use client";

import { useEffect } from "react";

/**
 * Scoped error boundary for /doctor/reports that surfaces the real error
 * message + stack on-screen (temporary diagnostic — the shared doctor
 * boundary hides it behind a generic message).
 */
export default function DoctorReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[doctor/reports] boundary:", error);
  }, [error]);

  return (
    <div className="p-6">
      <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
        <p className="font-bold">Reports page error (diagnostic)</p>
        <p className="mt-2">
          <span className="font-semibold">message:</span> {error?.message || "(no message)"}
        </p>
        {error?.digest ? (
          <p className="mt-1">
            <span className="font-semibold">digest:</span> {error.digest}
          </p>
        ) : null}
        {error?.stack ? (
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white/60 p-2 text-portal-thead">
            {error.stack}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="gh-btn gh-btn-primary mt-3 text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

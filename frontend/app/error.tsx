"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Something went wrong</h2>
      <p className="max-w-md text-sm text-[var(--color-text-muted)]">{error.message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="gh-btn gh-btn-primary"
        >
          Try again
        </button>
        <Link href="/" className="gh-btn gh-btn-outline">
          Back to home
        </Link>
      </div>
    </div>
  );
}

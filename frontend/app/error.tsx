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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-sm">{error.message}</p>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => reset()}
          className="border-border rounded-full border px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
        <Link href="/" className="text-primary hover:underline sm:self-center">
          Home
        </Link>
      </div>
    </div>
  );
}


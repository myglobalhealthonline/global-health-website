"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminEmptyState, Btn } from "./_components/atoms";

export default function AdminError({
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
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <AdminEmptyState
        tone="danger"
        icon={<AlertTriangle className="size-5" aria-hidden />}
        title="Something went wrong"
        description={
          error.digest
            ? `An unexpected error occurred loading this page. Reference: ${error.digest}`
            : "An unexpected error occurred loading this page."
        }
        action={
          <Btn variant="primary" onClick={reset}>
            Try again
          </Btn>
        }
      />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminEmptyState, Btn } from "@/components/portal-atoms";

export default function DoctorError({
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
        description="This page ran into a problem loading. Your patient data and appointments are safe — try again, or come back to it in a moment."
        action={
          <Btn variant="primary" onClick={reset}>
            Try again
          </Btn>
        }
      />
    </div>
  );
}

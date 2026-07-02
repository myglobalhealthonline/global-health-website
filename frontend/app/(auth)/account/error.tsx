"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminEmptyState, Btn } from "@/components/portal-atoms";

export default function AccountError({
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
        description="We couldn't load this page. Nothing you've done has been lost — try again, or contact us if it keeps happening."
        action={
          <div className="flex flex-wrap justify-center gap-2.5">
            <Btn variant="primary" onClick={reset}>
              Try again
            </Btn>
            <Btn href="/contact" variant="secondary">
              Contact support
            </Btn>
          </div>
        }
      />
    </div>
  );
}

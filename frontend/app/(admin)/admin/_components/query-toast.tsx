"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Bridges the existing `?success=`/`?error=` server-action redirect pattern
 * to a Sonner toast, then strips those params from the URL so a reload
 * doesn't re-show a stale message. Drop into any admin page that redirects
 * with `success`/`error` query params after a server action.
 */
export function QueryToast() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (!success && !error) return;

    if (success) toast.success(success);
    if (error) toast.error(error);

    const next = new URLSearchParams(searchParams);
    next.delete("success");
    next.delete("error");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

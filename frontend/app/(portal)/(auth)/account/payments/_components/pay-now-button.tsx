"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";

type PayNowI18n = { payNow: string; loading: string; payNowError: string };
const DEFAULT_I18N: PayNowI18n = {
  payNow: "Complete payment",
  loading: "Loading…",
  payNowError: "Couldn't start payment — try again.",
};

/** "Complete payment" — resolves a live Stripe Checkout URL for a
 *  FAILED/REQUIRES_ACTION/UNPAID payment row and redirects. Mirrors
 *  ReceiptButton's fetch-then-open pattern, including its visible error
 *  state (16-002 — a null/failed resolve used to fail silently). */
export function PayNowButton({
  appointmentId,
  i18n = DEFAULT_I18N,
}: {
  appointmentId: string;
  i18n?: PayNowI18n;
}) {
  const [pending, startFetch] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startFetch(async () => {
      try {
        const res = await fetch(`/api/account/appointments/${appointmentId}/payment-url`, {
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: { url?: string | null };
        };
        const url = json.ok ? (json.data?.url ?? null) : null;
        if (url) {
          window.location.href = url;
        } else {
          setError(i18n.payNowError);
        }
      } catch {
        setError(i18n.payNowError);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[var(--portal-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        <CreditCard className="size-3.5" aria-hidden />
        {pending ? i18n.loading : i18n.payNow}
      </button>
      {error ? (
        <p className="text-xs text-rose-700" role="alert">{error}</p>
      ) : null}
    </div>
  );
}

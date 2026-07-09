"use client";

import { useTransition } from "react";
import { CreditCard } from "lucide-react";

type PayNowI18n = { payNow: string; loading: string };
const DEFAULT_I18N: PayNowI18n = { payNow: "Complete payment", loading: "Loading…" };

/** "Complete payment" — resolves a live Stripe Checkout URL for a
 *  FAILED/REQUIRES_ACTION/UNPAID payment row and redirects. Mirrors
 *  ReceiptButton's fetch-then-open pattern. */
export function PayNowButton({
  appointmentId,
  i18n = DEFAULT_I18N,
}: {
  appointmentId: string;
  i18n?: PayNowI18n;
}) {
  const [pending, startFetch] = useTransition();

  function onClick() {
    startFetch(async () => {
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
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[var(--portal-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
    >
      <CreditCard className="size-3.5" aria-hidden />
      {pending ? i18n.loading : i18n.payNow}
    </button>
  );
}

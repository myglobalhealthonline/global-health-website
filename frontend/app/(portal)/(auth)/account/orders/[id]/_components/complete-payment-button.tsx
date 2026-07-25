"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { Btn } from "@/components/portal-atoms";

type CompletePaymentI18n = {
  completePayment: string;
  completePaymentLoading: string;
  completePaymentError: string;
};
const DEFAULT_I18N: CompletePaymentI18n = {
  completePayment: "Complete payment",
  completePaymentLoading: "Loading…",
  completePaymentError: "Couldn't start payment — try again.",
};

/** Order-level "Complete payment" — resolves a live Stripe Checkout URL for
 *  an unpaid order and redirects. Mirrors PayNowButton's (appointment-level)
 *  fetch-then-redirect pattern, including its visible error state (15-001 /
 *  16-002 pattern) instead of failing silently when the order is no longer
 *  payable (e.g. cancelled in another tab). */
export function CompletePaymentButton({
  orderId,
  i18n = DEFAULT_I18N,
  size = "md",
}: {
  orderId: string;
  i18n?: CompletePaymentI18n;
  size?: "sm" | "md";
}) {
  const [pending, startFetch] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startFetch(async () => {
      try {
        const res = await fetch(`/api/account/orders/${orderId}/payment-url`, {
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
          setError(i18n.completePaymentError);
        }
      } catch {
        setError(i18n.completePaymentError);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Btn
        variant="primary"
        size={size}
        iconLeft={<CreditCard className="size-3.5" aria-hidden />}
        onClick={onClick}
        disabled={pending}
        loading={pending}
      >
        {pending ? i18n.completePaymentLoading : i18n.completePayment}
      </Btn>
      {error ? (
        <p className="text-xs text-rose-700" role="alert">{error}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";

type Props = { orderId: string; status: string };

export function AdminOrderActions({ orderId, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function patchStatus(next: "FULFILLED" | "CANCELLED") {
    if (next === "CANCELLED" && !window.confirm("Cancel this order? HELD slots will be released to OPEN. This cannot be undone here — issue a Stripe refund separately if already paid.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="gh-admin-order-actions flex flex-col items-end gap-1">
      <div className="gh-admin-order-actions__buttons flex items-center gap-2">
        {status === "PAID" ? (
          <button
            type="button"
            onClick={() => void patchStatus("FULFILLED")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
            Mark fulfilled
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void patchStatus("CANCELLED")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          <X className="size-3" />
          Cancel order
        </button>
      </div>
      {error ? (
        <p className="text-[11px] text-rose-700">{error}</p>
      ) : null}
    </div>
  );
}

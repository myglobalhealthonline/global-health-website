"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, RotateCcw } from "lucide-react";
import { PortalDialog } from "@/components/PortalDialog";
import { Btn } from "@/components/portal-atoms";

type Props = { orderId: string; status: string; canRefund?: boolean };

export function AdminOrderActions({ orderId, status, canRefund = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);

  function patchStatus(next: "FULFILLED" | "CANCELLED") {
    if (next === "CANCELLED") {
      setConfirmCancel(true);
      return;
    }
    runPatch(next);
  }

  function runPatch(next: "FULFILLED" | "CANCELLED") {
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

  function confirmCancelOrder() {
    setConfirmCancel(false);
    runPatch("CANCELLED");
  }

  function runRefund() {
    setConfirmRefund(false);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Refund failed");
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
            onClick={() => patchStatus("FULFILLED")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
            Mark fulfilled
          </button>
        ) : null}
        {canRefund ? (
          <button
            type="button"
            onClick={() => setConfirmRefund(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
            Refund
          </button>
        ) : null}
        {!["FULFILLED", "CANCELLED", "REFUNDED"].includes(status) ? (
          <button
            type="button"
            onClick={() => patchStatus("CANCELLED")}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            <X className="size-3" />
            Cancel order
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-[11px] text-rose-700">{error}</p>
      ) : null}

      <PortalDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel order"
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmCancel(false)}>
              Keep order
            </Btn>
            <Btn variant="danger" onClick={confirmCancelOrder}>
              Cancel order
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          Cancel this order? HELD slots will be released to OPEN. This cannot be undone here — issue a refund separately if already paid.
        </p>
      </PortalDialog>

      <PortalDialog
        open={confirmRefund}
        onClose={() => setConfirmRefund(false)}
        title="Refund order"
        danger
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirmRefund(false)}>
              Keep payment
            </Btn>
            <Btn variant="danger" onClick={runRefund}>
              Refund now
            </Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
          Refund the full amount to the customer via Stripe? The order is marked REFUNDED, and any HELD slots and reserved subscription credits are released. This cannot be undone.
        </p>
      </PortalDialog>
    </div>
  );
}

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
  const [cancelReason, setCancelReason] = useState("");
  const [confirmRefund, setConfirmRefund] = useState(false);

  function patchStatus(next: "FULFILLED" | "CANCELLED") {
    if (next === "CANCELLED") {
      setCancelReason("");
      setConfirmCancel(true);
      return;
    }
    runPatch(next);
  }

  function runPatch(next: "FULFILLED" | "CANCELLED", cancellationReason?: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: next,
          ...(cancellationReason !== undefined ? { cancellationReason } : {}),
        }),
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
    runPatch("CANCELLED", cancelReason.trim());
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
        <p className="text-portal-thead text-rose-700">{error}</p>
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
        <div className="flex flex-col gap-3">
          <p className="text-sm" style={{ color: "var(--portal-text-2)" }}>
            Cancel this order? HELD slots will be released, any pending payment link is voided, and a credit note plus cancellation email/WhatsApp go out to the patient and doctor. This cannot be undone here — issue a refund separately if already paid.
          </p>
          <label className="flex flex-col gap-1 text-sm" style={{ color: "var(--portal-text-2)" }}>
            Reason for cancellation (included in the notification)
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. Doctor unavailable, patient requested reschedule…"
              className="rounded-md border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--portal-line, var(--color-border))", background: "var(--portal-surface)" }}
            />
          </label>
        </div>
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

"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Receipt } from "lucide-react";

type ReceiptI18n = { loading: string; viewReceipt: string; receipt: string; receiptUnavailable: string };
const DEFAULT_I18N: ReceiptI18n = {
  loading: "Loading…",
  viewReceipt: "View receipt",
  receipt: "Receipt",
  receiptUnavailable: "Invoice not available",
};

export function ReceiptButton({
  paymentId,
  i18n = DEFAULT_I18N,
}: {
  paymentId: string;
  i18n?: ReceiptI18n;
}) {
  const [url, setUrl] = useState<string | null | "unavailable">(null);
  const [fetching, startFetch] = useTransition();

  function onClick() {
    if (url === "unavailable") return;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    startFetch(async () => {
      const res = await fetch(`/api/account/payments/${paymentId}/receipt-url`, {
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: { url?: string | null };
      };
      const receiptUrl = json.ok ? (json.data?.url ?? null) : null;
      if (receiptUrl) {
        setUrl(receiptUrl);
        window.open(receiptUrl, "_blank", "noopener,noreferrer");
      } else {
        setUrl("unavailable");
      }
    });
  }

  if (url === "unavailable") {
    return (
      <span className="gh-patient-receipt-unavailable text-xs text-[var(--portal-muted)]">{i18n.receiptUnavailable}</span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={fetching}
      className="gh-patient-receipt-button inline-flex min-h-11 items-center gap-1 px-3 text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-60"
    >
      {fetching ? (
        i18n.loading
      ) : url ? (
        <>{i18n.viewReceipt} <ExternalLink className="size-3" aria-hidden /></>
      ) : (
        <>{i18n.receipt} <Receipt className="size-3" aria-hidden /></>
      )}
    </button>
  );
}

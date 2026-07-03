"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Receipt } from "lucide-react";

export function ReceiptButton({ paymentId }: { paymentId: string }) {
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
      <span className="gh-patient-receipt-unavailable text-xs text-[var(--portal-muted)]">Invoice not available</span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={fetching}
      className="gh-patient-receipt-button inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-60"
    >
      {fetching ? (
        "Loading…"
      ) : url ? (
        <>View receipt <ExternalLink className="size-3" aria-hidden /></>
      ) : (
        <>Receipt <Receipt className="size-3" aria-hidden /></>
      )}
    </button>
  );
}

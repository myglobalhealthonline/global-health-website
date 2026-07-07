"use client";

import { useState } from "react";
import { Download, Mail, Loader2, Check } from "lucide-react";

/**
 * Per-row admin actions for an invoice/receipt: download the PDF (same-origin
 * link so the session cookie rides along) and resend the document email.
 * Both endpoints are proxied to the backend via next.config rewrites.
 */
export function InvoiceRowActions({
  invoiceId,
  variant = "table",
}: {
  invoiceId: string;
  variant?: "table" | "card";
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleResend() {
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/resend`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Resend failed (${res.status})`);
      setState("sent");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const btnBase =
    variant === "card"
      ? "gh-btn gh-btn-ghost text-sm inline-flex items-center gap-1.5"
      : "inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]";

  const resendLabel =
    state === "sending"
      ? "Sending…"
      : state === "sent"
        ? "Sent"
        : state === "error"
          ? "Failed — retry"
          : "Resend";

  return (
    <>
      <a
        href={`/api/admin/invoices/${invoiceId}/pdf`}
        className={btnBase}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Download className="size-3" aria-hidden />
        Download
      </a>
      <button type="button" onClick={handleResend} disabled={state === "sending"} className={btnBase}>
        {state === "sending" ? (
          <Loader2 className="size-3 animate-spin" aria-hidden />
        ) : state === "sent" ? (
          <Check className="size-3" aria-hidden />
        ) : (
          <Mail className="size-3" aria-hidden />
        )}
        {resendLabel}
      </button>
    </>
  );
}

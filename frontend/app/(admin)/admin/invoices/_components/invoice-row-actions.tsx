"use client";

import { useState } from "react";
import { Download, Mail, Loader2, Check, MessageCircle } from "lucide-react";

/**
 * Per-row admin actions for an invoice/receipt: download the PDF (same-origin
 * link so the session cookie rides along) and resend the document to the
 * patient by email or WhatsApp. All endpoints are proxied to the backend via
 * next.config rewrites.
 */
type SendState = "idle" | "sending" | "sent" | "error";

export function InvoiceRowActions({
  invoiceId,
  variant = "table",
}: {
  invoiceId: string;
  variant?: "table" | "card";
}) {
  const [emailState, setEmailState] = useState<SendState>("idle");
  const [waState, setWaState] = useState<SendState>("idle");
  const [waError, setWaError] = useState<string | null>(null);

  async function resend(channel: "email" | "whatsapp") {
    const setState = channel === "email" ? setEmailState : setWaState;
    setState("sending");
    try {
      const res = await fetch(`/api/admin/invoices/${invoiceId}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      if (!res.ok) {
        if (channel === "whatsapp") {
          const json = (await res.json().catch(() => null)) as { message?: string } | null;
          setWaError(json?.message ?? null);
        }
        throw new Error(`Resend failed (${res.status})`);
      }
      if (channel === "whatsapp") setWaError(null);
      setState("sent");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const btnBase =
    variant === "card"
      ? "gh-btn gh-btn-ghost text-sm inline-flex items-center gap-1.5"
      : "inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]";

  function label(state: SendState, idle: string): string {
    if (state === "sending") return "Sending…";
    if (state === "sent") return "Sent";
    if (state === "error") return "Failed — retry";
    return idle;
  }

  function icon(state: SendState, Idle: typeof Mail) {
    if (state === "sending") return <Loader2 className="size-3 animate-spin" aria-hidden />;
    if (state === "sent") return <Check className="size-3" aria-hidden />;
    return <Idle className="size-3" aria-hidden />;
  }

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
      <button
        type="button"
        onClick={() => resend("email")}
        disabled={emailState === "sending"}
        className={btnBase}
      >
        {icon(emailState, Mail)}
        {label(emailState, "Resend")}
      </button>
      <button
        type="button"
        onClick={() => resend("whatsapp")}
        disabled={waState === "sending"}
        className={btnBase}
        title={waState === "error" && waError ? waError : "Send document link on WhatsApp (consent-gated)"}
      >
        {icon(waState, MessageCircle)}
        {label(waState, "WhatsApp")}
      </button>
    </>
  );
}

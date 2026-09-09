"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Truck } from "lucide-react";

type Props = {
  orderId: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
  /** Last time these details actually reached the customer. */
  trackingNotifiedAt?: string | null;
  /** Only kit orders can be "dispatched" — hides the notify action elsewhere. */
  hasHealthTestItem?: boolean;
};

/**
 * Admin-side tracking entry.
 *
 * Two deliberately separate actions. "Save tracking" PATCHes the same admin
 * order endpoint the status actions use. "Save & notify" saves first and then
 * sends the details to the customer by email and WhatsApp — a courier code is
 * pasted from another tab and worth eyeballing before it goes out, and a save
 * that sent on its own would fire on every half-typed correction.
 */
export function AdminTrackingForm({
  orderId,
  trackingNumber,
  trackingCarrier,
  trackingUrl,
  trackingNotifiedAt,
  hasHealthTestItem,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [number, setNumber] = useState(trackingNumber ?? "");
  const [carrier, setCarrier] = useState(trackingCarrier ?? "");
  const [url, setUrl] = useState(trackingUrl ?? "");

  async function save(): Promise<boolean> {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trackingNumber: number.trim() || null,
        trackingCarrier: carrier.trim() || null,
        trackingUrl: url.trim() || null,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setError(json?.message ?? "Failed to save tracking details");
      return false;
    }
    return true;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      if (await save()) {
        setNotice("Tracking saved. The customer has not been told yet.");
        router.refresh();
      }
    });
  }

  function onSaveAndNotify() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      // Save first: the send reads the columns, so notifying without saving
      // would mail out whatever was there before this edit.
      if (!(await save())) return;
      const res = await fetch(`/api/admin/orders/${orderId}/tracking-notify`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        setError(json?.message ?? "Saved, but the customer could not be notified");
        router.refresh();
        return;
      }
      const sent = [
        json.data?.emailSent ? "email" : null,
        json.data?.whatsappSent ? "WhatsApp" : null,
      ].filter(Boolean);
      const notes: string[] = Array.isArray(json.data?.notes) ? json.data.notes : [];
      setNotice(
        `Sent by ${sent.join(" and ")}.${notes.length > 0 ? ` ${notes.join(" ")}` : ""}`,
      );
      router.refresh();
    });
  }

  const notifiedLabel = trackingNotifiedAt
    ? `Last sent to the customer ${new Date(trackingNotifiedAt).toLocaleString()}`
    : "Not yet sent to the customer";

  return (
    <form onSubmit={onSubmit} className="grid gap-3 p-5 text-sm">
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">Tracking number</span>
        <input
          className="gh-input"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="e.g. 1Z999AA10123456784"
          maxLength={200}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">Carrier</span>
        <input
          className="gh-input"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="e.g. DHL, An Post, UPS"
          maxLength={120}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">Tracking URL</span>
        <input
          className="gh-input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          maxLength={500}
        />
      </label>

      {hasHealthTestItem ? (
        <p className="text-xs text-[var(--color-text-muted)]">{notifiedLabel}</p>
      ) : null}
      {error ? <p className="text-portal-thead text-rose-700">{error}</p> : null}
      {notice ? <p className="text-portal-thead text-emerald-800">{notice}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3 animate-spin" /> : <Truck className="size-3" />}
          Save tracking
        </button>
        {hasHealthTestItem ? (
          <button
            type="button"
            onClick={onSaveAndNotify}
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
            {trackingNotifiedAt ? "Save & re-send to customer" : "Save & notify customer"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

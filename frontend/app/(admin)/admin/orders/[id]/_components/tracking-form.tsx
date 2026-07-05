"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck } from "lucide-react";

type Props = {
  orderId: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  trackingUrl: string | null;
};

/** Admin-side tracking entry — PATCHes the same admin order endpoint the
 *  status actions use (order-actions.tsx), just with tracking fields
 *  instead of `status`. */
export function AdminTrackingForm({ orderId, trackingNumber, trackingCarrier, trackingUrl }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState(trackingNumber ?? "");
  const [carrier, setCarrier] = useState(trackingCarrier ?? "");
  const [url, setUrl] = useState(trackingUrl ?? "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
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
        return;
      }
      router.refresh();
    });
  }

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
      {error ? <p className="text-[11px] text-rose-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <Truck className="size-3" />}
        Save tracking
      </button>
    </form>
  );
}

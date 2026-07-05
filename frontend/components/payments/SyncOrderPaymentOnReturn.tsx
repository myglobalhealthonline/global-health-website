"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { syncOrderPayment } from "@/lib/api/payments-api";

/** After Stripe redirect, sync payment when webhook did not reach the server. */
export function SyncOrderPaymentOnReturn({
  skipIfSynced = false,
}: {
  skipIfSynced?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const synced = useRef(false);
  const orderId = params?.get("orderId")?.trim();
  const stripeSessionId = params?.get("session_id")?.trim();
  const payment = params?.get("payment")?.trim();

  useEffect(() => {
    if (skipIfSynced || synced.current) return;
    if (!orderId && !stripeSessionId) return;
    if (payment === "cancelled") return;
    synced.current = true;

    const run = async () => {
      const first = await syncOrderPayment({
        ...(orderId ? { orderId } : {}),
        ...(stripeSessionId ? { stripeSessionId } : {}),
      });
      // Re-run the server component (re-fetches order + sync status) so the
      // "Confirming payment..." spinner actually resolves into the success
      // view once the sync lands — previously this returned with no
      // follow-up, so the page never re-rendered and the spinner spun
      // forever even though the payment had succeeded.
      if (first.ok) {
        router.refresh();
        return;
      }
      // Stripe may still be finalizing — retry once after a short delay.
      await new Promise((r) => setTimeout(r, 2000));
      const second = await syncOrderPayment({
        ...(orderId ? { orderId } : {}),
        ...(stripeSessionId ? { stripeSessionId } : {}),
      });
      if (second.ok) {
        router.refresh();
      }
    };

    void run().catch(() => undefined);
  }, [orderId, stripeSessionId, payment, skipIfSynced, router]);

  return null;
}

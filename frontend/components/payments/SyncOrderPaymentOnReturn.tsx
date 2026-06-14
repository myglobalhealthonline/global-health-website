"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { syncOrderPayment } from "@/lib/api/payments-api";

/** After Stripe redirect, sync payment when webhook did not reach the server. */
export function SyncOrderPaymentOnReturn({
  skipIfSynced = false,
}: {
  skipIfSynced?: boolean;
}) {
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
      if (first.ok) return;
      // Stripe may still be finalizing — retry once after a short delay.
      await new Promise((r) => setTimeout(r, 2000));
      await syncOrderPayment({
        ...(orderId ? { orderId } : {}),
        ...(stripeSessionId ? { stripeSessionId } : {}),
      });
    };

    void run().catch(() => undefined);
  }, [orderId, stripeSessionId, payment, skipIfSynced]);

  return null;
}

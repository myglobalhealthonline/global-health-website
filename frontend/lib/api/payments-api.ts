import { apiRequest } from "./client";

export type SyncOrderPaymentResult =
  | { ok: true; code: "SYNCED" | "ALREADY_PAID" }
  | { ok: false; code: string; paymentStatus?: string };

export async function syncOrderPayment(input: {
  orderId?: string;
  stripeSessionId?: string;
}) {
  return apiRequest<SyncOrderPaymentResult>("/api/payments/sync-order", {
    method: "POST",
    sameOrigin: true,
    body: input,
  });
}

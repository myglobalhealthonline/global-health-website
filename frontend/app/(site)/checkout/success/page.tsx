import { Suspense } from "react";
import { syncOrderPaymentServer } from "@/lib/api/cart-server";
import { LegacyCheckoutSuccessClient } from "./LegacyCheckoutSuccessClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ orderId?: string; session_id?: string; payment?: string }>;
};

export default async function LegacyCheckoutSuccessPage({ searchParams }: Props) {
  const { orderId, session_id: stripeSessionId, payment } = await searchParams;
  const trimmedOrderId = orderId?.trim();
  let paymentSynced = false;

  if (payment !== "cancelled") {
    const sync = await syncOrderPaymentServer({
      orderId: trimmedOrderId,
      stripeSessionId: stripeSessionId?.trim(),
      source: "legacy-checkout-success",
    });
    paymentSynced = sync.ok;
  }

  return (
    <Suspense fallback={null}>
      <LegacyCheckoutSuccessClient
        orderId={trimmedOrderId}
        paymentSynced={paymentSynced}
      />
    </Suspense>
  );
}

import { Suspense } from "react";
import { syncOrderPaymentServer } from "@/lib/api/cart-server";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { LegacyCheckoutSuccessClient } from "./LegacyCheckoutSuccessClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ orderId?: string; session_id?: string; payment?: string }>;
};

export default async function LegacyCheckoutSuccessPage({ searchParams }: Props) {
  const { orderId, session_id: stripeSessionId, payment } = await searchParams;
  const trimmedOrderId = orderId?.trim();
  let paymentSynced = false;
  const locale = await getPageLocale();
  const { home } = loadLocaleBundle(locale);
  const successI18n = home.flow.checkoutSuccess;

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
        i18n={successI18n}
      />
    </Suspense>
  );
}

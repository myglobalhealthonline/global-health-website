import { Suspense } from "react";
import type { Metadata } from "next";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { syncOrderPaymentServer } from "@/lib/api/cart-server";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { LegacyCheckoutSuccessClient } from "./LegacyCheckoutSuccessClient";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPageLocale(); const success = loadLocaleBundle(locale).home.flow.checkoutSuccess;
  return buildPublicMetadata({ path: "/checkout/success", title: success.paymentReceivedTitle, description: success.paymentReceivedBody, locale, kind: "page", subtitle: success.confirmingPaymentTitle, noindex: true });
}

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
    <Suspense fallback={<div className="flex min-h-[calc(100dvh-var(--header-height))] items-center justify-center bg-[var(--color-background-soft)] px-5 py-16" aria-busy="true" />}>
      <LegacyCheckoutSuccessClient
        orderId={trimmedOrderId}
        paymentSynced={paymentSynced}
        i18n={successI18n}
      />
    </Suspense>
  );
}

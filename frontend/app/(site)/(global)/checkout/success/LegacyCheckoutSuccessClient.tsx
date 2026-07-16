"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { SyncOrderPaymentOnReturn } from "@/components/payments/SyncOrderPaymentOnReturn";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

type SuccessI18n = {
  paymentReceivedTitle: string;
  paymentReceivedBody: string;
  confirmingPaymentTitle: string;
  confirmingPaymentBody: string;
};

type Props = {
  orderId?: string;
  paymentSynced: boolean;
  i18n: SuccessI18n;
};

export function LegacyCheckoutSuccessClient({ orderId, paymentSynced, i18n }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const { cart, loading } = useCart();

  useEffect(() => {
    if (loading) return;
    const code = cart.countryCode?.toLowerCase() as CountryCode | undefined;
    const config = code ? getCountryByCode(code) : null;
    const qs = params?.toString();
    if (config) {
      const slug = COUNTRY_CODE_TO_SLUG[config.code] ?? config.code;
      const lang = (config.defaultLocale ?? "en").toLowerCase();
      router.replace(`/${slug}/${lang}/checkout/success${qs ? `?${qs}` : ""}`);
      return;
    }
    if (!orderId) {
      router.replace("/");
    }
  }, [loading, cart.countryCode, params, router, orderId]);

  if (orderId) {
    return (
      <>
        {!paymentSynced ? (
          <SyncOrderPaymentOnReturn skipIfSynced={paymentSynced} />
        ) : null}
        <GH2StatusPage
          status="success"
          title={i18n.paymentReceivedTitle}
          body={i18n.paymentReceivedBody}
        />
      </>
    );
  }

  return (
    <GH2StatusPage
      status="loading"
      title={i18n.confirmingPaymentTitle}
      body={i18n.confirmingPaymentBody}
    />
  );
}

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { SyncOrderPaymentOnReturn } from "@/components/payments/SyncOrderPaymentOnReturn";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

type Props = {
  orderId?: string;
  paymentSynced: boolean;
};

export function LegacyCheckoutSuccessClient({ orderId, paymentSynced }: Props) {
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
          title="Payment received"
          body="Your payment was successful. Confirmation details will arrive by email and WhatsApp."
        />
      </>
    );
  }

  return (
    <GH2StatusPage
      status="loading"
      title="Confirming payment"
      body="We are opening your country-specific confirmation page."
    />
  );
}

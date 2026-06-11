"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

export default function LegacyCheckoutSuccessRedirect() {
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
    } else {
      router.replace("/");
    }
  }, [loading, cart.countryCode, params, router]);

  return (
    <GH2StatusPage status="loading" title="Confirming payment" body="We are opening your country-specific confirmation page." />
  );
}

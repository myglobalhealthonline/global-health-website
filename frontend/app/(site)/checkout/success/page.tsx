"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

/**
 * Legacy Stripe success URL. New checkout sessions always send a
 * country-scoped `returnTo`, but in-flight sessions before this
 * change may still land here — bounce them to the canonical
 * `/[country]/[lang]/checkout/success`, preserving `orderId`.
 */
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
    <main className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
      <p className="text-sm text-slate-500">Confirming your payment…</p>
    </main>
  );
}

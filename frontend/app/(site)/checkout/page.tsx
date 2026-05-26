"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

/**
 * Legacy `/checkout` URL. Canonical lives at
 * `/[country]/[lang]/checkout`. Bounce based on the cart's country.
 */
export default function LegacyCheckoutRedirect() {
  const router = useRouter();
  const { cart, loading } = useCart();

  useEffect(() => {
    if (loading) return;
    const code = cart.countryCode?.toLowerCase() as CountryCode | undefined;
    const config = code ? getCountryByCode(code) : null;
    if (config) {
      const slug = COUNTRY_CODE_TO_SLUG[config.code] ?? config.code;
      const lang = (config.defaultLocale ?? "en").toLowerCase();
      router.replace(`/${slug}/${lang}/checkout`);
    } else {
      router.replace("/");
    }
  }, [loading, cart.countryCode, router]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8" style={{ minHeight: "60vh", background: "var(--color-background-dark)" }}>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Opening checkout…</p>
    </main>
  );
}

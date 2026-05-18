"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

/**
 * Legacy `/cart` URL. The canonical cart lives at
 * `/[country]/[lang]/cart` so the URL keeps the country context the
 * user picked. We can't resolve country server-side without a cookie,
 * but `useCart()` knows the active country via the cart record. Wait
 * for it to load, then bounce.
 */
export default function LegacyCartRedirect() {
  const router = useRouter();
  const { cart, loading } = useCart();

  useEffect(() => {
    if (loading) return;
    const code = cart.countryCode?.toLowerCase() as CountryCode | undefined;
    const config = code ? getCountryByCode(code) : null;
    if (config) {
      const slug = COUNTRY_CODE_TO_SLUG[config.code] ?? config.code;
      const lang = (config.defaultLocale ?? "en").toLowerCase();
      router.replace(`/${slug}/${lang}/cart`);
    } else {
      // No country in the cart cookie — drop the user on the country
      // gate so they can pick one and start over.
      router.replace("/");
    }
  }, [loading, cart.countryCode, router]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm text-slate-500">Opening your cart…</p>
    </main>
  );
}

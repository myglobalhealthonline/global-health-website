"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { LAST_COUNTRY_COOKIE } from "@/lib/routing/last-country";

/** Remembered country from the gh-last-country cookie (`<slug>:<lang>`). */
function readRememberedCountry(): { slug: string; lang: string } | null {
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${LAST_COUNTRY_COOKIE}=([^;]+)`),
  );
  if (!m) return null;
  const [slug, lang] = decodeURIComponent(m[1]).split(":");
  return slug && lang ? { slug, lang } : null;
}

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
      // Empty cart hasn't fixed a country yet — open the remembered
      // country's cart page (which renders its own empty state) instead of
      // bouncing to the gateway. Only fall back to "/" when the visitor has
      // never picked a country at all.
      const remembered = readRememberedCountry();
      router.replace(
        remembered ? `/${remembered.slug}/${remembered.lang}/cart` : "/",
      );
    }
  }, [loading, cart.countryCode, router]);

  return (
    <>
      <GH2FlowHeader title="Opening your cart" activeStep={1} steps={["Cart", "Checkout", "Payment"]} />
      <section className="bg-[var(--color-background-soft)] px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-[var(--color-text-muted)]">Opening your cart...</p>
        </div>
      </section>
    </>
  );
}

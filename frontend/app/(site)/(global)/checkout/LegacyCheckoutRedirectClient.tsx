"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { GH2FlowHeader } from "@/components/sections/GH2PagePrimitives";
import { getCountryByCode, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

type Props = {
  title: string;
  stepCart: string;
  stepCheckout: string;
  stepPayment: string;
  body: string;
};

export function LegacyCheckoutRedirectClient({ title, stepCart, stepCheckout, stepPayment, body }: Props) {
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
    <>
      <GH2FlowHeader title={title} activeStep={2} steps={[stepCart, stepCheckout, stepPayment]} />
      <section className="bg-[var(--color-background-soft)] px-5 py-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-[var(--color-text-muted)]">{body}</p>
        </div>
      </section>
    </>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import { getCountryByCode } from "@/data/countries";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { SITE_NAME } from "@/lib/constants";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";
import { CheckoutPageClient } from "./_components/CheckoutPageClient";

type Params = { country: string; lang: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, lang } = await params;
  const code = countryCodeFromSlug(country);
  const config = code ? getCountryByCode(code) : null;
  if (!code || !config || !isSupportedLocale(lang)) {
    return { title: SITE_NAME, robots: { index: false, follow: false } };
  }
  const t = loadLocaleBundle(lang as LocaleCode).common.checkoutPage;
  const title = `${t.title} · ${config.name}`;
  return buildPublicMetadata({
    path: `/${country}/${lang}/checkout`,
    title,
    description: t.redirectNote,
    locale: `${lang}_${code.toUpperCase()}`,
    subtitle: config.name,
    imageAlt: `${t.title} — ${SITE_NAME}`,
    languages: hreflangAlternates(config, "/checkout"),
    noindex: true,
  });
}

// Server wrapper: resolve the locale slices here (server-only) and pass just
// the strings the client needs, so the all-locale bundle never ships to the
// browser (P-001). Same fallback semantics as loadLocaleBundle's `?? .en`.
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ country: string; lang: string }>;
}) {
  const { lang } = await params;
  const bundle = loadLocaleBundle((lang || "en") as LocaleCode);
  return (
    <Suspense fallback={<div className="mx-auto max-w-[var(--container-width)] min-h-[70vh] px-5 md:px-10" aria-busy="true" />}>
      <CheckoutPageClient
        t={bundle.common.checkoutPage}
        cartT={bundle.common.cartPage}
        coverageT={bundle.subscription.coverage}
      />
    </Suspense>
  );
}

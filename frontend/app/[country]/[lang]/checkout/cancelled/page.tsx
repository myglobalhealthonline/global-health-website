import Link from "next/link";
import type { Metadata } from "next";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { getCountryByCode } from "@/data/countries";
import { isSupportedLocale } from "@/lib/content/get-public-page";
import { SITE_NAME } from "@/lib/constants";
import { countryCodeFromSlug } from "@/lib/routing/country-slug";
import { hreflangAlternates } from "@/lib/seo/hreflang";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

export const dynamic = "force-dynamic";

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
  const t = loadLocaleBundle(lang as LocaleCode).common.checkoutStatus;
  const title = `${t.cancelledTitle} · ${config.name}`;
  return buildPublicMetadata({
    path: `/${country}/${lang}/checkout/cancelled`,
    title,
    description: t.cancelledBody,
    locale: `${lang}_${code.toUpperCase()}`,
    subtitle: config.name,
    imageAlt: `${t.cancelledTitle} — ${SITE_NAME}`,
    languages: hreflangAlternates(config, "/checkout/cancelled"),
    noindex: true,
  });
}

export default async function CheckoutCancelledPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { country, lang } = await params;
  const cartHref = `/${country}/${lang}/cart`;
  const homeHref = `/${country}/${lang}`;
  const t = loadLocaleBundle(lang as LocaleCode).common.checkoutStatus;
  return (
    <GH2StatusPage
      status="cancelled"
      title={t.cancelledTitle}
      body={t.cancelledBody}
    >
      <Link href={cartHref} className="gh2-btn-lime">
        {t.backToCart}
      </Link>
      <Link href={homeHref} className="rounded-full border border-[rgba(29,75,54,0.25)] px-6 py-4 text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[rgba(29,75,54,0.06)]">
        {t.keepShopping}
      </Link>
    </GH2StatusPage>
  );
}

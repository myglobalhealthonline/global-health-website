import Link from "next/link";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type Params = { country: string; lang: string };

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

import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { SyncOrderPaymentOnReturn } from "@/components/payments/SyncOrderPaymentOnReturn";
import { fetchOrderReceipt, syncOrderPaymentServer } from "@/lib/api/cart-server";
import { formatPrice } from "@/lib/format-currency";
import { formatOrderDisplayId } from "@/lib/format-order-display";
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
type Props = {
  params: Promise<Params>;
  searchParams: Promise<{ orderId?: string; session_id?: string; payment?: string }>;
};

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
  const title = `${t.successTitle} · ${config.name}`;
  return buildPublicMetadata({
    path: `/${country}/${lang}/checkout/success`,
    title,
    description: t.successBody,
    locale: `${lang}_${code.toUpperCase()}`,
    subtitle: config.name,
    imageAlt: `${t.successTitle} — ${SITE_NAME}`,
    languages: hreflangAlternates(config, "/checkout/success"),
    noindex: true,
  });
}

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { country, lang } = await params;
  const { orderId, session_id: stripeSessionId, payment } = await searchParams;
  let paymentSynced = false;
  if (payment !== "cancelled") {
    const sync = await syncOrderPaymentServer({
      orderId: orderId?.trim(),
      stripeSessionId: stripeSessionId?.trim(),
      source: "country-checkout-success",
    });
    paymentSynced = sync.ok;
  }
  const orderRes = orderId ? await fetchOrderReceipt(orderId) : null;
  const order = orderRes?.ok ? orderRes.data : null;
  const homeHref = `/${country}/${lang}`;
  const doctorsHref = `/${country}/${lang}/doctors`;
  const t = loadLocaleBundle(lang as LocaleCode).common.checkoutStatus;

  // Processing state (2.3): when we have an order that Stripe hasn't confirmed
  // paid yet (webhook race) and the server sync didn't confirm it either, show a
  // "confirming payment" state instead of an unconditional success. The client
  // SyncOrderPaymentOnReturn keeps retrying + reloads the page once it lands.
  const orderConfirmedPaid =
    order?.paymentStatus === "PAID" || order?.status === "PAID" || paymentSynced;
  const processing = Boolean(orderId) && !orderConfirmedPaid;

  if (processing) {
    return (
      <>
        <Suspense fallback={null}>
          <SyncOrderPaymentOnReturn skipIfSynced={false} />
        </Suspense>
        <GH2StatusPage
          status="loading"
          title={t.processingTitle}
          body={
            <>
              {t.processingBody}
              <br />
              <span className="text-[13px] text-[var(--color-text-muted)]">Usually under 30 seconds.</span>
            </>
          }
        >
          <Link href="/account/orders" className="gh2-btn-lime">
            {t.viewOrders}
          </Link>
        </GH2StatusPage>
      </>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <SyncOrderPaymentOnReturn skipIfSynced={paymentSynced} />
      </Suspense>
      <GH2StatusPage
      status="success"
      title={t.successTitle}
      body={t.successBody}
      reference={
        order ? (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {t.orderRef.replace("{id}", formatOrderDisplayId(order))}
            </p>
            <ul className="mt-4 space-y-3 text-[13px] text-[var(--color-text-body)]">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    {item.name} <span className="text-[var(--color-text-muted)]">x {item.quantity}</span>
                  </span>
                  <span className="font-semibold [font-variant-numeric:tabular-nums] text-[var(--color-text-primary)]">
                    {formatPrice(item.lineTotalCents, order.currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
            {order.shippingCents > 0 ? (
              <div className="mt-3 flex justify-between text-[13px] text-[var(--color-text-muted)]">
                <span>{t.shipping}</span>
                <span className="[font-variant-numeric:tabular-nums]">{formatPrice(order.shippingCents, order.currencyCode)}</span>
              </div>
            ) : null}
            <div className="mt-4 flex justify-between border-t border-[var(--color-border)] pt-3 text-base text-[var(--color-text-primary)]">
              <span className="font-bold">{t.totalPaid}</span>
              <span className="font-bold [font-variant-numeric:tabular-nums]">{formatPrice(order.totalCents, order.currencyCode)}</span>
            </div>
          </div>
        ) : orderId ? (
          <p
            role="status"
            className="gh-status-info rounded-[var(--radius-card-sm)] px-3 py-2.5 text-sm"
          >
            {t.receiptError}
          </p>
        ) : null
      }
    >
      <Link href="/account/orders" className="gh2-btn-lime">
        {t.viewOrders}
      </Link>
      <Link href={doctorsHref} className="rounded-full border border-[rgba(29,75,54,0.25)] px-6 py-4 text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[rgba(29,75,54,0.06)]">
        {t.browseDoctors}
      </Link>
      <Link href={homeHref} className="rounded-full border border-[rgba(29,75,54,0.25)] px-6 py-4 text-sm font-semibold text-[var(--color-brand-primary)] hover:bg-[rgba(29,75,54,0.06)]">
        {t.continueShopping}
      </Link>
    </GH2StatusPage>
    </>
  );
}

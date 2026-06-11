import Link from "next/link";
import { GH2StatusPage } from "@/components/sections/GH2PagePrimitives";
import { fetchOrderReceipt } from "@/lib/api/cart-server";
import { formatPrice } from "@/lib/format-currency";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type Params = { country: string; lang: string };
type Props = {
  params: Promise<Params>;
  searchParams: Promise<{ orderId?: string }>;
};

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { country, lang } = await params;
  const { orderId } = await searchParams;
  const orderRes = orderId ? await fetchOrderReceipt(orderId) : null;
  const order = orderRes?.ok ? orderRes.data : null;
  const homeHref = `/${country}/${lang}`;
  const doctorsHref = `/${country}/${lang}/doctors`;
  const t = loadLocaleBundle(lang as LocaleCode).common.checkoutStatus;

  return (
    <GH2StatusPage
      status="success"
      title={t.successTitle}
      body={t.successBody}
      reference={
        order ? (
          <div>
            <p>{t.orderRef.replace("{id}", order.id.slice(-8))}</p>
            <ul className="mt-4 space-y-3 normal-case tracking-normal text-[13px] font-sans text-[var(--color-text-body)]">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>
                    {item.name} <span className="text-[var(--color-text-muted)]">x {item.quantity}</span>
                  </span>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {formatPrice(item.lineTotalCents, order.currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
            {order.shippingCents > 0 ? (
              <div className="mt-3 flex justify-between normal-case tracking-normal text-[13px] font-sans text-[var(--color-text-muted)]">
                <span>{t.shipping}</span>
                <span>{formatPrice(order.shippingCents, order.currencyCode)}</span>
              </div>
            ) : null}
            <div className="mt-4 flex justify-between border-t border-[var(--color-border)] pt-3 normal-case tracking-normal text-base font-sans text-[var(--color-text-primary)]">
              <span className="font-bold">{t.totalPaid}</span>
              <span className="font-bold">{formatPrice(order.totalCents, order.currencyCode)}</span>
            </div>
          </div>
        ) : orderId ? (
          <p className="normal-case tracking-normal font-sans text-sm text-[var(--color-status-warning-text)]">
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
  );
}

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { fetchOrderReceipt } from "@/lib/api/cart-server";
import { formatPrice } from "@/lib/format-currency";

export const dynamic = "force-dynamic";

type Params = { country: string; lang: string };
type Props = {
  params: Promise<Params>;
  searchParams: Promise<{ orderId?: string }>;
};

export default async function CheckoutSuccessPage({ params, searchParams }: Props) {
  const { country, lang } = await params;
  const { orderId } = await searchParams;
  // Public receipt — keyed on the unguessable order id. Works for both
  // authenticated patients and guest checkouts (the old path forced a
  // patient session and dead-ended guests with an empty card).
  const orderRes = orderId ? await fetchOrderReceipt(orderId) : null;
  const order = orderRes?.ok ? orderRes.data : null;
  const homeHref = `/${country}/${lang}`;
  const doctorsHref = `/${country}/${lang}/doctors`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-10" aria-hidden />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-slate-900 sm:text-4xl">
          Payment received
        </h1>
        <p className="mt-3 max-w-md text-slate-600">
          Thanks{order?.fullName ? `, ${order.fullName.split(" ")[0]}` : ""}. Your
          order is confirmed — a receipt has been emailed to you.
        </p>
      </div>

      {order ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Order
          </p>
          <p className="font-mono text-sm text-slate-900">#{order.id.slice(-8)}</p>

          <ul className="mt-4 space-y-2 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span className="text-slate-700">
                  {i.name} <span className="text-slate-400">× {i.quantity}</span>
                </span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(i.lineTotalCents, order.currencyCode)}
                </span>
              </li>
            ))}
          </ul>

          {order.shippingCents > 0 ? (
            <div className="mt-3 flex justify-between text-sm text-slate-600">
              <span>Shipping</span>
              <span>{formatPrice(order.shippingCents, order.currencyCode)}</span>
            </div>
          ) : null}

          <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-base">
            <span className="font-bold">Total paid</span>
            <span className="font-bold">
              {formatPrice(order.totalCents, order.currencyCode)}
            </span>
          </div>
        </div>
      ) : orderId ? (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          We couldn&apos;t load the receipt right now. Your payment is confirmed —
          check your email for the order details, or contact support if anything
          looks off.
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          View my orders
        </Link>
        <Link
          href={doctorsHref}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Browse doctors
        </Link>
        <Link
          href={homeHref}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}

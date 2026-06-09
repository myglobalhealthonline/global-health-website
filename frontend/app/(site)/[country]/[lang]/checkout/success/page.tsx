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
        <div
          className="inline-flex size-16 items-center justify-center rounded-full"
          style={{ background: "var(--color-accent-soft)", color: "var(--color-brand-primary)" }}
        >
          <CheckCircle2 className="size-10" aria-hidden />
        </div>
        <h1 className="gh-h1 mt-6">
          Payment received
        </h1>
        <p className="gh-body mt-3 max-w-md" style={{ color: "var(--color-text-muted)" }}>
          Thanks{order?.fullName ? `, ${order.fullName.split(" ")[0]}` : ""}. Your
          order is confirmed — a receipt has been emailed to you.
        </p>
      </div>

      {order ? (
        <div className="gh-card mt-8 p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="gh-eyebrow text-xs font-semibold uppercase tracking-wider">
            Order
          </p>
          <p className="font-mono text-sm" style={{ color: "var(--color-text-primary)" }}>#{order.id.slice(-8)}</p>

          <ul className="mt-4 space-y-2 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span style={{ color: "var(--color-text-body)" }}>
                  {i.name} <span style={{ color: "var(--color-text-muted)" }}>× {i.quantity}</span>
                </span>
                <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {formatPrice(i.lineTotalCents, order.currencyCode)}
                </span>
              </li>
            ))}
          </ul>

          {order.shippingCents > 0 ? (
            <div className="mt-3 flex justify-between text-sm" style={{ color: "var(--color-text-muted)" }}>
              <span>Shipping</span>
              <span>{formatPrice(order.shippingCents, order.currencyCode)}</span>
            </div>
          ) : null}

          <div
            className="mt-4 flex justify-between border-t pt-3 text-base"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
          >
            <span className="font-bold">Total paid</span>
            <span className="font-bold">
              {formatPrice(order.totalCents, order.currencyCode)}
            </span>
          </div>
        </div>
      ) : orderId ? (
        <div className="gh-status-warning mt-8 rounded-[var(--radius-card)] p-4 text-sm">
          We couldn&apos;t load the receipt right now. Your payment is confirmed —
          check your email for the order details, or contact support if anything
          looks off.
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/account/orders" className="gh-btn gh-btn-primary">
          View my orders
        </Link>
        <Link href={doctorsHref} className="gh-btn gh-btn-outline">
          Browse doctors
        </Link>
        <Link href={homeHref} className="gh-btn gh-btn-outline">
          Continue shopping
        </Link>
      </div>
    </main>
  );
}

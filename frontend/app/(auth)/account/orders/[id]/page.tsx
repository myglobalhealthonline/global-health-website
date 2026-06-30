import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchAccountOrder } from "@/lib/api/cart-server";
import { AdminCard, PageHeader, Pill, SectionHeader } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
import { formatAppDateTime } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { formatOrderDisplayId } from "@/lib/format-order-display";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function statusTone(status: string): PillTone {
  if (status === "PAID") return "published";
  if (status === "FULFILLED") return "active";
  if (status === "CANCELLED" || status === "REFUNDED") return "inactive";
  if (status === "PENDING") return "pending";
  return "neutral";
}

export default async function AccountOrderDetailPage({ params }: Props) {
  const [{ id }, locale] = await Promise.all([params, getPageLocale()]);
  const res = await fetchAccountOrder(id);
  if (!res.ok) notFound();
  const order = res.data;
  const { account: a } = loadLocaleBundle(locale);

  return (
    <div className="gh-patient-page gh-patient-order-detail-page">
      <Link
        href="/account/orders"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {a.orders.backToOrders}
      </Link>

      <PageHeader
        eyebrow={`Order #${formatOrderDisplayId(order)}`}
        title={
          <span className="inline-flex items-center gap-3">
            {formatPrice(order.totalCents, order.currencyCode)}
            <Pill tone={statusTone(order.status)}>{order.status.toLowerCase()}</Pill>
          </span>
        }
        description={a.orders.placedOn.replace("{date}", formatAppDateTime(order.createdAt))}
      />

      <div className="gh-patient-detail-grid grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <AdminCard padding={0}>
          <SectionHeader title={a.orders.itemsSection} />
          <div className="p-5">
            <ul className="divide-y divide-[var(--color-border)]">
              {order.items.map((i) => (
                <li
                  key={i.id}
                  className="gh-patient-list-row flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {i.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {i.kind === "HEALTH_TEST" ? a.orders.healthTest : a.orders.onlinePrescription}
                      {" · "}
                      {formatPrice(i.unitPriceCents, order.currencyCode)} × {i.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    {formatPrice(i.lineTotalCents, order.currencyCode)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
              <Row label={a.orders.subtotal} value={formatPrice(order.subtotalCents, order.currencyCode)} />
              <Row label={a.orders.shippingCost} value={formatPrice(order.shippingCents, order.currencyCode)} />
              <Row label={a.orders.total} value={formatPrice(order.totalCents, order.currencyCode)} bold />
            </dl>
          </div>
        </AdminCard>

        <aside className="grid gap-4 self-start">
          <AdminCard padding={0}>
            <SectionHeader title={a.orders.shippingSection} />
            <div className="p-5 text-sm text-[var(--color-text-primary)]">
              {order.ship.name ? (
                <>
                  <p className="font-semibold">{order.ship.name}</p>
                  <p>{order.ship.line1}</p>
                  {order.ship.line2 ? <p>{order.ship.line2}</p> : null}
                  <p>
                    {order.ship.city} {order.ship.postalCode}
                  </p>
                  <p>{order.ship.countryCode}</p>
                </>
              ) : (
                <p className="text-[var(--color-text-muted)]">{a.orders.noAddress}</p>
              )}
            </div>
          </AdminCard>

          <AdminCard padding={0}>
            <SectionHeader title={a.orders.contact} />
            <div className="p-5 text-sm">
              <p>{order.fullName}</p>
              <p className="text-[var(--color-text-muted)]">{order.email}</p>
              {order.phone ? (
                <p className="text-[var(--color-text-muted)]">{order.phone}</p>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard padding={0}>
            <SectionHeader title={a.orders.payment} />
            <div className="p-5 text-sm">
              <p>
                <span className="text-[var(--color-text-muted)]">{a.orders.statusLabel}:</span>{" "}
                <span className="font-semibold">{order.paymentStatus}</span>
              </p>
              {order.paidAt ? (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {a.orders.paidOn.replace("{date}", formatAppDateTime(order.paidAt))}
                </p>
              ) : null}
            </div>
          </AdminCard>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className={bold ? "font-bold" : "text-[var(--color-text-muted)]"}>{label}</dt>
      <dd className={bold ? "font-bold" : "font-semibold text-[var(--color-text-primary)]"}>
        {value}
      </dd>
    </div>
  );
}

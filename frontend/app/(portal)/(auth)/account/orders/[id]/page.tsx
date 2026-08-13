import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageCheck, Truck, CreditCard, ShoppingBag, Stethoscope, CalendarClock } from "lucide-react";
import { fetchAccountOrder } from "@/lib/api/cart-server";
import { ReorderButton } from "./_components/reorder-button";
import { CompletePaymentButton } from "./_components/complete-payment-button";
import { AdminCard, AdminSummaryStrip, PageHeader, Pill, SectionHeader } from "@/components/portal-atoms";
import { formatAppDateTime } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { formatOrderDisplayId } from "@/lib/format-order-display";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { statusTone } from "@/lib/format-order-status";
import { SetCrumbTitle } from "@/components/crumb-title";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/** Payment stat-card hint — status-specific instead of a blanket "awaiting
 *  confirmation" for every non-paid state (was contradicting a FAILED/
 *  CANCELLED value shown right above it). */
function paymentHint(
  order: { paymentStatus: string; paidAt: string | null; status: string },
  a: { orders: { awaitingConfirmation: string; paymentFailedHint: string; paymentCancelledHint: string } },
): string {
  if (order.paidAt) return formatAppDateTime(order.paidAt);
  if (order.status === "CANCELLED") return a.orders.paymentCancelledHint;
  if (order.paymentStatus === "FAILED") return a.orders.paymentFailedHint;
  return a.orders.awaitingConfirmation;
}

export default async function AccountOrderDetailPage({ params }: Props) {
  const [{ id }, locale] = await Promise.all([params, getPortalLocale()]);
  const res = await fetchAccountOrder(id);
  if (!res.ok) notFound();
  const order = res.data;
  const { account: a } = loadLocaleBundle(locale);

  // 15-001: the only interactive element on this page used to be "Reorder"
  // (which starts a brand-new cart) — an unpaid order had no path to
  // actually finish paying for itself. Any status short of PAID/REFUNDED on
  // a non-cancelled, non-refunded order still needs a payment action
  // (PENDING/FAILED/UNPAID all qualify); resolveOrderPaymentUrl on the
  // backend is the final authority and returns no URL if it disagrees.
  const needsPayment =
    order.paymentStatus !== "PAID" &&
    order.paymentStatus !== "REFUNDED" &&
    order.status !== "CANCELLED" &&
    order.status !== "REFUNDED";

  return (
    <div className="gh-patient-page gh-patient-order-detail-page">
      <SetCrumbTitle label={`#${formatOrderDisplayId(order)}`} />
      <Link
        href="/account/orders"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--portal-muted)] hover:text-[var(--portal-text)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {a.orders.backToOrders}
      </Link>

      <PageHeader
        eyebrow={a.orders.orderNumber.replace("{id}", formatOrderDisplayId(order))}
        title={
          <span
            className="inline-flex items-center gap-3"
            aria-label={`${formatPrice(order.totalCents, order.currencyCode)}, ${order.status.toLowerCase()}`}
          >
            <span aria-hidden="true">{formatPrice(order.totalCents, order.currencyCode)}</span>
            <Pill tone={statusTone(order.status)}>{order.status.toLowerCase()}</Pill>
          </span>
        }
        description={a.orders.placedOn.replace("{date}", formatAppDateTime(order.createdAt))}
      />

      {needsPayment ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">{a.orders.paymentActionTitle}</p>
            <p className="text-xs text-amber-800">{a.orders.paymentActionBody}</p>
          </div>
          <CompletePaymentButton orderId={order.id} i18n={a.orders} />
        </div>
      ) : null}

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: a.orders.sumStatus, value: order.status.toLowerCase(), hint: a.orders.sumStatusHint, icon: <PackageCheck aria-hidden /> },
          { label: a.orders.payment, value: order.paymentStatus.toLowerCase(), hint: paymentHint(order, a), icon: <CreditCard aria-hidden /> },
          { label: a.orders.sumItems, value: String(order.items.length), hint: a.orders.sumItemsHint, icon: <ShoppingBag aria-hidden /> },
          { label: a.orders.total, value: formatPrice(order.totalCents, order.currencyCode), hint: a.orders.inclShipping, icon: <Truck aria-hidden /> },
        ]}
      />

      <div className="gh-patient-detail-grid grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <AdminCard padding={0}>
          <SectionHeader
            as="h2"
            title={a.orders.itemsSection}
            right={<ReorderButton items={order.items} i18n={a.orders} />}
          />
          <div className="p-5">
            <ul className="divide-y divide-[var(--portal-line)]">
              {order.items.map((i) => (
                <li
                  key={i.id}
                  className="gh-patient-list-row grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--portal-text)]">
                      {i.name}
                    </p>
                    <p className="text-xs text-[var(--portal-muted)]">
                      {i.kind === "HEALTH_TEST" ? a.orders.healthTest : a.orders.onlinePrescription}
                      {" · "}
                      {formatPrice(i.unitPriceCents, order.currencyCode)} × {i.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-[var(--portal-text)]">
                    {formatPrice(i.lineTotalCents, order.currencyCode)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-[var(--portal-line)] pt-4 text-sm">
              <Row label={a.orders.subtotal} value={formatPrice(order.subtotalCents, order.currencyCode)} />
              <Row label={a.orders.shippingCost} value={formatPrice(order.shippingCents, order.currencyCode)} />
              <Row label={a.orders.total} value={formatPrice(order.totalCents, order.currencyCode)} bold />
            </dl>
          </div>
        </AdminCard>

        {/* 15-006: one "Order info" surface with dividered sub-sections
            instead of 5 separate AdminCards — no content removed, only
            merged. Tracking stays first when present (most actionable). */}
        <aside className="self-start">
          <AdminCard padding={0}>
            <SectionHeader as="h2" title={a.orders.orderInfoSection} />
            <div className="divide-y divide-[var(--portal-line)]">
              {order.consultations && order.consultations.length > 0 ? (
                <div className="p-5 text-sm">
                  <p className="mb-2 text-portal-thead font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
                    {a.orders.consultationSection}
                  </p>
                  <ul className="grid gap-3">
                    {order.consultations.map((c) => (
                      <li key={c.appointmentId} className="flex items-start gap-3">
                        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--portal-surface-elevated)] text-[var(--portal-primary)]">
                          <Stethoscope className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--portal-text)]">
                            {c.doctorName ?? a.orders.doctorUnassigned}
                          </p>
                          <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-[var(--portal-muted)]">
                            <CalendarClock className="size-3.5" aria-hidden />
                            {c.scheduledAt ? formatAppDateTime(c.scheduledAt) : a.orders.timeTbc}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {order.trackingNumber ? (
                <div className="p-5 text-sm">
                  <p className="mb-2 text-portal-thead font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
                    {a.orders.trackShipment}
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                      <Truck className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      {order.trackingCarrier ? (
                        <p className="text-xs text-[var(--portal-muted)]">{order.trackingCarrier}</p>
                      ) : null}
                      {order.trackingUrl ? (
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[var(--portal-primary)] underline-offset-2 hover:underline"
                        >
                          {order.trackingNumber}
                        </a>
                      ) : (
                        <p className="font-semibold text-[var(--portal-text)]">{order.trackingNumber}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="p-5 text-sm text-[var(--portal-text)]">
                <p className="mb-2 text-portal-thead font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
                  {a.orders.shippingSection}
                </p>
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
                  <p className="text-[var(--portal-muted)]">{a.orders.noAddress}</p>
                )}
              </div>

              <div className="p-5 text-sm">
                <p className="mb-2 text-portal-thead font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
                  {a.orders.contact}
                </p>
                <p>{order.fullName}</p>
                <p className="text-[var(--portal-muted)]">{order.email}</p>
                {order.phone ? (
                  <p className="text-[var(--portal-muted)]">{order.phone}</p>
                ) : null}
              </div>

              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[var(--portal-surface-elevated)] text-[var(--portal-primary)]">
                    <PackageCheck className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--portal-text)]">{a.orders.careRecordTitle}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--portal-muted)]">
                      {a.orders.careRecordBody}
                    </p>
                  </div>
                </div>
              </div>
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
      <dt className={bold ? "font-bold" : "text-[var(--portal-muted)]"}>{label}</dt>
      <dd className={bold ? "font-bold" : "font-semibold text-[var(--portal-text)]"}>
        {value}
      </dd>
    </div>
  );
}

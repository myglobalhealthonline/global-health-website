import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchAccountOrder } from "@/lib/api/cart-server";
import { AdminCard, PageHeader, Pill, SectionHeader } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
import { formatAppDateTime } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";

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
  const { id } = await params;
  const res = await fetchAccountOrder(id);
  if (!res.ok) notFound();
  const order = res.data;

  return (
    <>
      <Link
        href="/account/orders"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Back to orders
      </Link>

      <PageHeader
        eyebrow={`Order #${order.id.slice(-8)}`}
        title={
          <span className="inline-flex items-center gap-3">
            {formatPrice(order.totalCents, order.currencyCode)}
            <Pill tone={statusTone(order.status)}>{order.status.toLowerCase()}</Pill>
          </span>
        }
        description={`Placed ${formatAppDateTime(order.createdAt)}`}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <AdminCard padding={0}>
          <SectionHeader title="Items" />
          <div className="p-5">
            <ul className="divide-y divide-[var(--color-border)]">
              {order.items.map((i) => (
                <li
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {i.name}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {i.kind === "HEALTH_TEST" ? "Health test" : "Online prescription"}
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
              <Row label="Subtotal" value={formatPrice(order.subtotalCents, order.currencyCode)} />
              <Row label="Shipping" value={formatPrice(order.shippingCents, order.currencyCode)} />
              <Row label="Total" value={formatPrice(order.totalCents, order.currencyCode)} bold />
            </dl>
          </div>
        </AdminCard>

        <aside className="grid gap-4 self-start">
          <AdminCard padding={0}>
            <SectionHeader title="Shipping" />
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
                <p className="text-[var(--color-text-muted)]">No address on file.</p>
              )}
            </div>
          </AdminCard>

          <AdminCard padding={0}>
            <SectionHeader title="Contact" />
            <div className="p-5 text-sm">
              <p>{order.fullName}</p>
              <p className="text-[var(--color-text-muted)]">{order.email}</p>
              {order.phone ? (
                <p className="text-[var(--color-text-muted)]">{order.phone}</p>
              ) : null}
            </div>
          </AdminCard>

          <AdminCard padding={0}>
            <SectionHeader title="Payment" />
            <div className="p-5 text-sm">
              <p>
                <span className="text-[var(--color-text-muted)]">Status:</span>{" "}
                <span className="font-semibold">{order.paymentStatus}</span>
              </p>
              {order.paidAt ? (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Paid {formatAppDateTime(order.paidAt)}
                </p>
              ) : null}
            </div>
          </AdminCard>
        </aside>
      </div>
    </>
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

import { ShoppingBag, ChevronRight } from "lucide-react";
import { fetchAccountOrders } from "@/lib/api/cart-server";
import type { OrderListItem } from "@/lib/api/cart-types";
import { CompletePaymentButton } from "./[id]/_components/complete-payment-button";
import { AdminCard, AdminEmptyState, Btn, MetaLine, PageHeader, Pill, SectionHeader } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { formatAppDate } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { formatOrderDisplayId } from "@/lib/format-order-display";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

function statusTone(status: string): PillTone {
  if (status === "PAID") return "published";
  if (status === "FULFILLED") return "active";
  if (status === "CANCELLED" || status === "REFUNDED") return "inactive";
  if (status === "PENDING") return "pending";
  return "neutral";
}

export default async function AccountOrdersPage() {
  const [result, locale] = await Promise.all([
    fetchAccountOrders(),
    getPageLocale(),
  ]);
  const { account: a } = loadLocaleBundle(locale);
  const items = result.ok ? result.data.items : [];
  const paid = items.filter((item) => item.status === "PAID" || item.status === "FULFILLED").length;
  const pending = items.filter((item) => item.status === "PENDING").length;
  const totalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
  const currency = items.find((item) => item.currencyCode)?.currencyCode ?? "EUR";

  const needsPayment = (o: OrderListItem) =>
    o.paymentStatus !== "PAID" &&
    o.paymentStatus !== "REFUNDED" &&
    o.status !== "CANCELLED" &&
    o.status !== "REFUNDED";

  const orderFields: ColumnPriorityField<OrderListItem>[] = [
    {
      key: "orderNumber",
      label: a.orders.colOrderNumber,
      priority: 1,
      cardPrimary: true,
      render: (o) => (
        <span className="font-mono text-xs text-[var(--portal-muted)]">
          #{formatOrderDisplayId(o)}
        </span>
      ),
    },
    {
      key: "date",
      label: a.orders.colDate,
      priority: 2,
      render: (o) => formatAppDate(o.createdAt),
    },
    {
      key: "items",
      label: a.orders.colItems,
      priority: 2,
      render: (o) =>
        o.itemCount === 1
          ? a.orders.items.replace("{count}", String(o.itemCount))
          : a.orders.itemsPlural.replace("{count}", String(o.itemCount)),
    },
    {
      key: "status",
      label: a.orders.colStatus,
      priority: 2,
      render: (o) => <Pill tone={statusTone(o.status)}>{o.status.toLowerCase()}</Pill>,
    },
    {
      key: "total",
      label: a.orders.colTotal,
      priority: 2,
      render: (o) => (
        <span className="font-semibold text-[var(--portal-text)]">
          {formatPrice(o.totalCents, o.currencyCode)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      priority: 2,
      align: "right",
      desktopOnly: true,
      render: (o) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {needsPayment(o) ? <CompletePaymentButton orderId={o.id} i18n={a.orders} size="sm" /> : null}
          <Btn
            href={`/account/orders/${o.id}`}
            variant="secondary"
            size="sm"
            iconRight={<ChevronRight className="size-3.5" />}
          >
            {a.orders.open}
          </Btn>
        </div>
      ),
    },
  ];

  return (
    <div className="gh-patient-page gh-patient-orders-page">
      <PageHeader
        eyebrow={a.orders.breadcrumb}
        title={a.orders.title}
        description={a.orders.subtitle}
      />

      {/* Rule S3 (audit 14-001/14-004): counts as a plain meta line, not stat
          cards — keeps the order list above the fold. */}
      <MetaLine
        items={[
          { label: a.orders.sumOrdersHint, value: items.length },
          { label: a.orders.sumPaidHint, value: paid },
          { label: a.orders.sumPendingHint, value: pending },
          { label: a.orders.sumTotalHint, value: formatPrice(totalCents, currency) },
        ]}
      />

      {items.length === 0 ? (
        <AdminCard padding={0}>
          <SectionHeader
            title={
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="size-4" aria-hidden /> {a.orders.orderHistory}
              </span>
            }
            right={
              <Btn href="/" variant="primary" size="sm">
                {a.orders.orderMore}
              </Btn>
            }
          />
          <div className="p-5">
            <AdminEmptyState
              icon={<ShoppingBag className="size-6" aria-hidden />}
              assetSrc="/images/portal/obsidian/empty-payments.svg"
              title={a.orders.noOrders}
              description="Health tests, prescriptions, and checkout orders will appear here after purchase."
              action={
                <Btn href="/" variant="primary" size="sm">
                  {a.orders.browseProducts}
                </Btn>
              }
            />
          </div>
        </AdminCard>
      ) : (
        // 14-002/14-003: single surface, no nested padding div — the
        // SectionHeader's own padding + ColumnPriorityTable's built-in row
        // padding replace the old AdminCard > div.p-5 > ul double-wrap.
        <AdminCard padding={0}>
          <SectionHeader
            title={
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="size-4" aria-hidden /> {a.orders.orderHistory}
              </span>
            }
            right={
              <Btn href="/" variant="primary" size="sm">
                {a.orders.orderMore}
              </Btn>
            }
          />
          <ColumnPriorityTable
            fields={orderFields}
            rows={items}
            getRowKey={(o) => o.id}
            cardActions={(o) => (
              <div className="flex flex-wrap items-center gap-2">
                {needsPayment(o) ? <CompletePaymentButton orderId={o.id} i18n={a.orders} size="sm" /> : null}
                <Btn
                  href={`/account/orders/${o.id}`}
                  variant="secondary"
                  size="sm"
                  iconRight={<ChevronRight className="size-3.5" />}
                >
                  {a.orders.open}
                </Btn>
              </div>
            )}
          />
        </AdminCard>
      )}
    </div>
  );
}

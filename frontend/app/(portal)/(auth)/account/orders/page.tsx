import { ShoppingBag, ChevronRight, CheckCircle2, Clock3, CreditCard } from "lucide-react";
import { fetchAccountOrders } from "@/lib/api/cart-server";
import type { OrderListItem } from "@/lib/api/cart-types";
import { CompletePaymentButton } from "./[id]/_components/complete-payment-button";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, Btn, PageHeader, Pill, SectionHeader } from "@/components/portal-atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { formatAppDate, formatAppDateTime } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { formatOrderDisplayId } from "@/lib/format-order-display";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { statusTone } from "@/lib/format-order-status";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const [result, locale] = await Promise.all([
    fetchAccountOrders(),
    getPortalLocale(),
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
      key: "doctor",
      label: a.orders.colDoctor,
      priority: 3,
      render: (o) => {
        const c = o.consultations?.[0];
        if (!c) return <span className="text-[var(--portal-muted)]">—</span>;
        return c.doctorName ?? a.orders.doctorUnassigned;
      },
    },
    {
      key: "consultation",
      label: a.orders.colConsultation,
      priority: 3,
      render: (o) => {
        const c = o.consultations?.[0];
        if (!c) return <span className="text-[var(--portal-muted)]">—</span>;
        return c.scheduledAt ? formatAppDateTime(c.scheduledAt) : a.orders.timeTbc;
      },
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

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: "Orders", value: String(items.length), hint: "Health tests and prescription orders", icon: <ShoppingBag aria-hidden /> },
          { label: "Paid", value: String(paid), hint: "Completed or fulfilled", icon: <CheckCircle2 aria-hidden /> },
          { label: "Pending", value: String(pending), hint: "Needs processing or payment", icon: <Clock3 aria-hidden /> },
          { label: "Total", value: formatPrice(totalCents, currency), hint: "Across visible orders", icon: <CreditCard aria-hidden /> },
        ]}
      />

      {items.length === 0 ? (
        <AdminCard padding={0}>
          <SectionHeader
            as="h2"
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
            />
          </div>
        </AdminCard>
      ) : (
        // 14-002/14-003: single surface, no nested padding div — the
        // SectionHeader's own padding + ColumnPriorityTable's built-in row
        // padding replace the old AdminCard > div.p-5 > ul double-wrap.
        <AdminCard padding={0}>
          <SectionHeader
            as="h2"
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

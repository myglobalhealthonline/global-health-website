import Link from "next/link";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { fetchAccountOrders } from "@/lib/api/cart-server";
import { AdminCard, Btn, PageHeader, Pill, SectionHeader } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
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

  return (
    <div className="gh-patient-page gh-patient-orders-page">
      <PageHeader
        eyebrow={a.orders.breadcrumb}
        title={a.orders.title}
        description={a.orders.subtitle}
      />

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
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              {a.orders.noOrders}{" "}
              <Link
                href="/"
                className="font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                {a.orders.browseProducts}
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {items.map((o) => (
                <li
                  key={o.id}
                className="gh-patient-list-row flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-[var(--color-text-muted)]">
                      #{formatOrderDisplayId(o)}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {o.itemCount === 1
                          ? a.orders.items.replace("{count}", String(o.itemCount))
                          : a.orders.itemsPlural.replace("{count}", String(o.itemCount))}
                      </span>
                      <span className="text-[var(--color-text-muted)]">
                        · {formatAppDate(o.createdAt)}
                      </span>
                      <Pill tone={statusTone(o.status)}>{o.status.toLowerCase()}</Pill>
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {formatPrice(o.totalCents, o.currencyCode)}
                      </span>
                    </p>
                  </div>
                  <Btn
                    href={`/account/orders/${o.id}`}
                    variant="secondary"
                    size="sm"
                    iconRight={<ChevronRight className="size-3.5" />}
                  >
                    {a.orders.open}
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminCard>
    </div>
  );
}

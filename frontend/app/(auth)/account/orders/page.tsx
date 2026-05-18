import Link from "next/link";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { fetchAccountOrders } from "@/lib/api/cart-server";
import { AdminCard, Btn, PageHeader, Pill, SectionHeader } from "@/components/portal-atoms";
import type { PillTone } from "@/components/portal-atoms";
import { formatAppDate } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";

export const dynamic = "force-dynamic";

function statusTone(status: string): PillTone {
  if (status === "PAID") return "published";
  if (status === "FULFILLED") return "active";
  if (status === "CANCELLED" || status === "REFUNDED") return "inactive";
  if (status === "PENDING") return "pending";
  return "neutral";
}

export default async function AccountOrdersPage() {
  const result = await fetchAccountOrders();
  const items = result.ok ? result.data.items : [];

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="My orders"
        description="Health tests + online prescriptions you've ordered. Consultation bookings live under 'My bookings'."
      />

      <AdminCard padding={0}>
        <SectionHeader
          title={
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="size-4" aria-hidden /> Order history
            </span>
          }
          right={
            <Btn href="/" variant="primary" size="sm">
              Order more
            </Btn>
          }
        />
        <div className="p-5">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No orders yet.{" "}
              <Link
                href="/"
                className="font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                Browse products →
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {items.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-[var(--color-text-muted)]">
                      #{o.id.slice(-8)}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
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
                    Open
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </div>
      </AdminCard>
    </>
  );
}

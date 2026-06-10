import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { fetchAdminOrders } from "@/lib/api/cart-server";
import { AdminCard, PageHeader } from "@/components/portal-atoms";
import { AdminOrdersTable } from "./_components/admin-orders-table";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ cursor?: string }>;
}) {
  const { cursor } = searchParams ? await searchParams : {};
  const result = await fetchAdminOrders(cursor);
  const items = result.ok ? result.data.items : [];
  const nextCursor = result.ok ? result.data.nextCursor : null;

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <ShoppingBag className="size-3.5" aria-hidden /> Commerce
          </span>
        }
        title="Orders"
        description="Multi-item product orders. Google Meet links are created automatically when consultation orders are paid."
      />

      <AdminCard padding={0}>
        <div className="p-5">
          <AdminOrdersTable items={items} />
          <div className="mt-4 flex items-center justify-between text-[13px]">
            {cursor ? (
              <Link href="/admin/orders" className="font-semibold underline">
                ← First page
              </Link>
            ) : (
              <span />
            )}
            {nextCursor ? (
              <Link
                href={`/admin/orders?cursor=${encodeURIComponent(nextCursor)}`}
                className="font-semibold underline"
              >
                Next page →
              </Link>
            ) : (
              <span className="text-[var(--color-text-muted)]">No more orders</span>
            )}
          </div>
        </div>
      </AdminCard>
    </>
  );
}

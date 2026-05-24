import { ShoppingBag } from "lucide-react";
import { fetchAdminOrders } from "@/lib/api/cart-server";
import { AdminCard, PageHeader } from "@/components/portal-atoms";
import {
  AdminOrdersTable,
  type AdminOrderRow,
} from "./_components/admin-orders-table";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const result = await fetchAdminOrders();
  const items = result.ok ? (result.data.items as AdminOrderRow[]) : [];

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
        </div>
      </AdminCard>
    </>
  );
}

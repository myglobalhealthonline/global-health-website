import Link from "next/link";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { fetchAdminOrders } from "@/lib/api/cart-server";
import {
  AdminCard,
  AdminTable,
  IconBtn,
  PageHeader,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
  type PillTone,
} from "@/components/portal-atoms";
import { formatAppDate } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";

export const dynamic = "force-dynamic";

type AdminOrderRow = {
  id: string;
  status: string;
  paymentStatus: string;
  email: string;
  fullName: string;
  countryCode: string;
  currencyCode: string;
  totalCents: number;
  itemCount: number;
  paidAt: string | null;
  createdAt: string;
};

function statusTone(status: string): PillTone {
  if (status === "PAID") return "published";
  if (status === "FULFILLED") return "active";
  if (status === "CANCELLED" || status === "REFUNDED") return "inactive";
  if (status === "PENDING") return "pending";
  return "neutral";
}

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
        description="Multi-item product orders. Consultation bookings stay on the Appointments queue."
      />

      <AdminCard padding={0}>
        <div className="overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Country</Th>
              <Th>Items</Th>
              <Th align="right">Total</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th align="right" style={{ width: 80 }}>
                {" "}
              </Th>
            </Thead>
            <tbody>
              {items.length === 0 ? (
                <Tr>
                  <Td>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      No orders yet.
                    </span>
                  </Td>
                </Tr>
              ) : (
                items.map((o) => (
                  <Tr key={o.id}>
                    <Td>
                      <span className="font-mono text-xs">#{o.id.slice(-8)}</span>
                    </Td>
                    <Td>
                      <span className="block font-semibold text-[var(--color-text-primary)]">
                        {o.fullName}
                      </span>
                      <span className="block text-xs text-[var(--color-text-muted)]">
                        {o.email}
                      </span>
                    </Td>
                    <Td>{o.countryCode.toUpperCase()}</Td>
                    <Td>{o.itemCount}</Td>
                    <Td align="right">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {formatPrice(o.totalCents, o.currencyCode)}
                      </span>
                    </Td>
                    <Td>
                      <Pill tone={statusTone(o.status)}>{o.status.toLowerCase()}</Pill>
                    </Td>
                    <Td>{formatAppDate(o.createdAt)}</Td>
                    <Td align="right">
                      <IconBtn ariaLabel={`Open order ${o.id}`} href={`/admin/orders/${o.id}`}>
                        <ExternalLink className="size-3.5" aria-hidden />
                      </IconBtn>
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </div>
      </AdminCard>
    </>
  );
}

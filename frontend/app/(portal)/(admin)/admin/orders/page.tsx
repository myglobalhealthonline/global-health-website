import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { fetchAdminOrders } from "@/lib/api/cart-server";
import { fetchAdminDoctors } from "@/lib/admin/admin-api";
import { AdminCard, AdminEmptyState, PageHeader } from "@/components/portal-atoms";
import { AdminOrdersTable } from "./_components/admin-orders-table";
import { OrderFilters } from "./_components/order-filters";
import {
  ORDER_FILTER_KEYS,
  type OrderFilterValues,
} from "./_components/order-filter-keys";

export const dynamic = "force-dynamic";

type FilterKey = (typeof ORDER_FILTER_KEYS)[number];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ cursor?: string } & Partial<Record<FilterKey, string>>>;
}) {
  const sp = searchParams ? await searchParams : {};
  const { cursor } = sp;

  const filters: OrderFilterValues = {};
  for (const key of ORDER_FILTER_KEYS) {
    const val = sp[key]?.trim();
    if (val) filters[key] = val;
  }
  const hasActiveFilter = ORDER_FILTER_KEYS.some((key) => Boolean(filters[key]));

  // No `active` filter on the doctor list — deactivated doctors still own
  // historical orders, and dropping them would make those unfilterable.
  // The doctor list only feeds the filter dropdown — its failure must never
  // take down the orders list, so it degrades to an empty option set.
  const [result, doctorsResult] = await Promise.all([
    fetchAdminOrders(cursor, filters),
    fetchAdminDoctors({ pageSize: "250" }).catch(
      () => ({ ok: false as const, message: "Doctors unavailable" }),
    ),
  ]);
  const items = result.ok ? result.data.items : [];
  const nextCursor = result.ok ? result.data.nextCursor : null;

  // The backend matches `doctorName` as a case-insensitive substring of the
  // assigned doctor's full name, so the option value is the name itself.
  const doctorNames = doctorsResult.ok
    ? Array.from(new Set(doctorsResult.data.items.map((d) => d.fullName))).sort((a, b) =>
        a.localeCompare(b),
      )
    : [];
  const activeDoctorName = filters.doctorName ?? "";
  const doctorOptions = [
    { value: "", label: "All doctors" },
    ...doctorNames.map((name) => ({ value: name, label: name })),
    // A doctorName arriving by URL must stay selected rather than silently
    // resetting to "All doctors" on the next search.
    ...(activeDoctorName && !doctorNames.includes(activeDoctorName)
      ? [{ value: activeDoctorName, label: activeDoctorName }]
      : []),
  ];

  // Query string carrying the active filters (no cursor) so paging keeps them.
  const filterQs = new URLSearchParams();
  for (const key of ORDER_FILTER_KEYS) {
    const val = filters[key];
    if (val) filterQs.set(key, val);
  }
  const filterSuffix = filterQs.toString();
  const firstPageHref = filterSuffix ? `/admin/orders?${filterSuffix}` : "/admin/orders";
  const nextPageHref = nextCursor
    ? `/admin/orders?${filterSuffix ? `${filterSuffix}&` : ""}cursor=${encodeURIComponent(nextCursor)}`
    : null;

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

      <AdminCard padding={0} className="gh-admin-orders-page">
        <OrderFilters values={filters} doctorOptions={doctorOptions} />

        <div className="p-5">
          {items.length === 0 && hasActiveFilter ? (
            <AdminEmptyState
              title="No matching orders"
              description="No orders match the current search or filters. Try widening the date ranges, clearing the doctor or status, or checking the spelling of the search term."
            />
          ) : (
            <AdminOrdersTable items={items} />
          )}
          <div className="gh-admin-order-pagination mt-4 flex items-center justify-between text-portal-compact">
            {cursor ? (
              <Link href={firstPageHref} className="font-semibold underline">
                ← First page
              </Link>
            ) : (
              <span />
            )}
            {nextPageHref ? (
              <Link href={nextPageHref} className="font-semibold underline">
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

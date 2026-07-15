import Link from "next/link";
import { Receipt } from "lucide-react";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { cookies } from "next/headers";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { formatPrice } from "@/lib/format-currency";
import { InvoiceFilters, type InvoiceFilterValues } from "./_components/invoice-filters";
import {
  AdminInvoiceOrdersTable,
  type InvoiceOrderGroup,
} from "./_components/admin-invoice-orders-table";

export const dynamic = "force-dynamic";

/** Filter keys forwarded verbatim to the backend list endpoint. */
const FILTER_KEYS = [
  "q",
  "kind",
  "documentType",
  "invoiceFrom",
  "invoiceTo",
  "consultFrom",
  "consultTo",
] as const;

async function fetchAdminInvoices(
  filters: InvoiceFilterValues,
  cursor?: string,
): Promise<{ orders: InvoiceOrderGroup[]; nextCursor: string | null }> {
  const backend = getBackendOrigin();
  if (!backend) return { orders: [], nextCursor: null };
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const qs = new URLSearchParams({ limit: "50" });
  if (cursor) qs.set("cursor", cursor);
  for (const key of FILTER_KEYS) {
    const val = filters[key];
    if (val) qs.set(key, val);
  }
  try {
    const res = await fetch(`${backend}/api/admin/invoices?${qs.toString()}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    if (!res.ok) return { orders: [], nextCursor: null };
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { orders: InvoiceOrderGroup[]; nextCursor: string | null };
    };
    if (!json.ok || !json.data) return { orders: [], nextCursor: null };
    return json.data;
  } catch {
    return { orders: [], nextCursor: null };
  }
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<
    { cursor?: string } & Partial<Record<(typeof FILTER_KEYS)[number], string>>
  >;
}) {
  const sp = searchParams ? await searchParams : {};
  const { cursor } = sp;
  const filters: InvoiceFilterValues = {
    q: sp.q,
    kind: sp.kind,
    documentType: sp.documentType,
    invoiceFrom: sp.invoiceFrom,
    invoiceTo: sp.invoiceTo,
    consultFrom: sp.consultFrom,
    consultTo: sp.consultTo,
  };
  const { orders, nextCursor } = await fetchAdminInvoices(filters, cursor);
  const allDocs = orders.flatMap((o) => o.documents);

  // Query string carrying the active filters (no cursor) so pagination keeps them.
  const filterQs = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const val = filters[key];
    if (val) filterQs.set(key, val);
  }
  const filterSuffix = filterQs.toString();
  const hasActiveFilter = filterSuffix.length > 0;
  const firstPageHref = filterSuffix ? `/admin/invoices?${filterSuffix}` : "/admin/invoices";
  const nextPageHref = nextCursor
    ? `/admin/invoices?${filterSuffix ? `${filterSuffix}&` : ""}cursor=${encodeURIComponent(nextCursor)}`
    : null;
  const sentCount = allDocs.filter((inv) => inv.emailSentAt).length;
  const totalCents = orders.reduce((sum, o) => sum + o.totalCents, 0);
  const primaryCurrency = orders[0]?.currencyCode ?? "EUR";

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <Receipt className="size-3.5" aria-hidden /> Commerce
          </span>
        }
        title="Invoices & Receipts"
        description="Unpaid invoices (manual / AI bookings), receipts once paid, and combined invoice/receipts for direct-website orders. Portugal is excluded. Download the PDF or resend it to the patient."
      />

      <AdminCard padding={0}>
        <div className="border-b border-[var(--color-border)] px-4 pt-4">
          <AdminSummaryStrip
            items={[
              {
                label: "Orders shown",
                value: orders.length,
                hint: `${allDocs.length} documents · ${cursor ? "cursor page" : "latest batch"}`,
                tone: "brand",
              },
              {
                label: "Email sent",
                value: sentCount,
                hint: `${allDocs.length - sentCount} pending`,
                tone: sentCount === allDocs.length && allDocs.length > 0 ? "success" : "neutral",
              },
              {
                label: "Visible value",
                value: formatPrice(totalCents, primaryCurrency),
                hint: primaryCurrency,
                tone: "neutral",
              },
            ]}
          />
        </div>

        <InvoiceFilters values={filters} />

        {orders.length === 0 ? (
          hasActiveFilter ? (
            <AdminEmptyState
              assetSrc="/images/portal/obsidian/empty-payments.svg"
              title="No matching invoices"
              description="No invoices match the current search or filters. Try widening the date range, clearing the consultation type, or checking the spelling of the search term."
            />
          ) : (
            <AdminEmptyState
              assetSrc="/images/portal/obsidian/empty-payments.svg"
              title="No invoices yet"
              description="Invoices are generated automatically after orders are paid. Once created, admins can open printable invoice records from here."
            />
          )
        ) : (
          <AdminInvoiceOrdersTable orders={orders} />
        )}

        <div className="gh-admin-ops-pagination flex items-center justify-between border-t border-[var(--color-border)] px-5 py-4 text-portal-compact">
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
            <span className="text-[var(--color-text-muted)]">No more invoices</span>
          )}
        </div>
      </AdminCard>
    </>
  );
}

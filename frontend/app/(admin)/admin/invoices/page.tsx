import Link from "next/link";
import { Receipt, ExternalLink } from "lucide-react";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { cookies } from "next/headers";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, PageHeader, Pill } from "@/components/portal-atoms";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDate } from "@/lib/format-datetime";
import { FlagBadge } from "../_components/flag-badge";
import { InvoiceFilters, type InvoiceFilterValues } from "./_components/invoice-filters";
import { InvoiceRowActions } from "./_components/invoice-row-actions";

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

type DocumentType = "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  countryCode: string;
  documentType: DocumentType;
  generatedAt: string;
  emailSentAt: string | null;
  emailSentTo: string | null;
  orderId: string;
  orderNumber: string | null;
  fullName: string;
  email: string;
  totalCents: number;
  currencyCode: string;
  paymentStatus: string;
};

/** Label + colour tone for each fiscal document type. */
const DOC_TYPE_META: Record<DocumentType, { label: string; className: string }> = {
  INVOICE: { label: "Invoice · Unpaid", className: "bg-amber-100 text-amber-800" },
  RECEIPT: { label: "Receipt", className: "bg-sky-100 text-sky-800" },
  INVOICE_RECEIPT: { label: "Invoice / Receipt", className: "bg-emerald-100 text-emerald-800" },
  CREDIT_NOTE: { label: "Credit Note", className: "bg-rose-100 text-rose-800" },
};

function DocTypeBadge({ documentType }: { documentType: DocumentType }) {
  const meta = DOC_TYPE_META[documentType] ?? DOC_TYPE_META.INVOICE_RECEIPT;
  return (
    <span
      className={`gh-admin-ops-badge inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

async function fetchAdminInvoices(
  filters: InvoiceFilterValues,
  cursor?: string,
): Promise<{ items: InvoiceRow[]; nextCursor: string | null }> {
  const backend = getBackendOrigin();
  if (!backend) return { items: [], nextCursor: null };
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
    if (!res.ok) return { items: [], nextCursor: null };
    const json = (await res.json()) as {
      ok?: boolean;
      data?: { items: InvoiceRow[]; nextCursor: string | null };
    };
    if (!json.ok || !json.data) return { items: [], nextCursor: null };
    return json.data;
  } catch {
    return { items: [], nextCursor: null };
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
  const { items, nextCursor } = await fetchAdminInvoices(filters, cursor);

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
  const sentCount = items.filter((inv) => inv.emailSentAt).length;
  const totalCents = items.reduce((sum, inv) => sum + inv.totalCents, 0);
  const primaryCurrency = items[0]?.currencyCode ?? "EUR";

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
                label: "Invoices shown",
                value: items.length,
                hint: cursor ? "Cursor page" : "Latest batch",
                tone: "brand",
              },
              {
                label: "Email sent",
                value: sentCount,
                hint: `${items.length - sentCount} pending`,
                tone: sentCount === items.length && items.length > 0 ? "success" : "neutral",
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

        {items.length === 0 ? (
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
          <>
        <div className="gh-admin-ops-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Generated</th>
                <th className="px-4 py-3">Emailed</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                  <tr
                    key={inv.id}
                    className="gh-admin-invoices-row border-b border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[13px] font-bold text-[var(--color-text-primary)]">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DocTypeBadge documentType={inv.documentType} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${inv.orderId}`}
                        className="font-mono text-xs text-[var(--color-brand-primary)] hover:underline"
                      >
                        {inv.orderNumber ?? inv.orderId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {inv.fullName}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)]">{inv.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <FlagBadge code={inv.countryCode} size={14} />
                        <span className="text-[12px] uppercase text-[var(--color-text-muted)]">
                          {inv.countryCode.toUpperCase()}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {formatPrice(inv.totalCents, inv.currencyCode)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-muted)]">
                      {formatAppDate(inv.generatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {inv.emailSentAt ? (
                        <span className="gh-admin-ops-badge inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                          Sent
                        </span>
                      ) : (
                        <span className="gh-admin-ops-badge inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/print/order-invoices/${inv.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gh-admin-invoices-view-link inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
                        >
                          <ExternalLink className="size-3" aria-hidden />
                          View
                        </Link>
                        <InvoiceRowActions invoiceId={inv.id} />
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="gh-admin-mobile-list">
          {items.map((inv) => (
            <PortalMobileCard
              key={inv.id}
              tone={inv.emailSentAt ? "success" : "warning"}
              title={<span className="font-mono">{inv.invoiceNumber}</span>}
              subtitle={inv.fullName}
              statusPill={
                <Pill tone={inv.emailSentAt ? "active" : "pending"}>
                  {inv.emailSentAt ? "Sent" : "Pending"}
                </Pill>
              }
              meta={[
                { label: "Document", value: <DocTypeBadge documentType={inv.documentType} /> },
                { label: "Email", value: inv.email },
                { label: "Total", value: `${formatPrice(inv.totalCents, inv.currencyCode)} · ${formatAppDate(inv.generatedAt)}` },
                {
                  label: "Country",
                  value: (
                    <span className="inline-flex items-center gap-2">
                      <FlagBadge code={inv.countryCode} size={14} />
                      {inv.countryCode.toUpperCase()}
                    </span>
                  ),
                },
              ]}
              actions={
                <>
                  <Link href={`/admin/orders/${inv.orderId}`} className="gh-btn gh-btn-ghost text-sm">
                    Order
                  </Link>
                  <Link
                    href={`/print/order-invoices/${inv.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gh-btn gh-btn-secondary text-sm"
                  >
                    View
                  </Link>
                  <InvoiceRowActions invoiceId={inv.id} variant="card" />
                </>
              }
            />
          ))}
        </div>
        </>
        )}

        <div className="gh-admin-ops-pagination flex items-center justify-between border-t border-[var(--color-border)] px-5 py-4 text-[13px]">
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

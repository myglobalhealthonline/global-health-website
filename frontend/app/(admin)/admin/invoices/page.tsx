import Link from "next/link";
import { Receipt, ExternalLink } from "lucide-react";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { cookies } from "next/headers";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, PageHeader, Pill } from "@/components/portal-atoms";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDate } from "@/lib/format-datetime";
import { FlagBadge } from "../_components/flag-badge";

export const dynamic = "force-dynamic";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  countryCode: string;
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

async function fetchAdminInvoices(
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
  searchParams?: Promise<{ cursor?: string }>;
}) {
  const { cursor } = searchParams ? await searchParams : {};
  const { items, nextCursor } = await fetchAdminInvoices(cursor);
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
        title="Invoices"
        description="Auto-generated invoices for paid orders. Portugal orders are excluded. Click View to open the printable invoice."
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
        {items.length === 0 ? (
          <AdminEmptyState
            assetSrc="/images/portal/obsidian/empty-payments.svg"
            title="No invoices yet"
            description="Invoices are generated automatically after orders are paid. Once created, admins can open printable invoice records from here."
          />
        ) : (
          <>
        <div className="gh-admin-ops-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                <th className="px-4 py-3">Invoice #</th>
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
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/print/order-invoices/${inv.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gh-admin-invoices-view-link inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        <ExternalLink className="size-3" aria-hidden />
                        View
                      </Link>
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
                    View invoice
                  </Link>
                </>
              }
            />
          ))}
        </div>
        </>
        )}

        <div className="gh-admin-ops-pagination flex items-center justify-between border-t border-[var(--color-border)] px-5 py-4 text-[13px]">
          {cursor ? (
            <Link href="/admin/invoices" className="font-semibold underline">
              ← First page
            </Link>
          ) : (
            <span />
          )}
          {nextCursor ? (
            <Link
              href={`/admin/invoices?cursor=${encodeURIComponent(nextCursor)}`}
              className="font-semibold underline"
            >
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

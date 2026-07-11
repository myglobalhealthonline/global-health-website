"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminTable, Pill, Td, Th, Thead, Tr } from "@/components/portal-atoms";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDate } from "@/lib/format-datetime";
import { FlagBadge } from "../../_components/flag-badge";
import { InvoiceRowActions } from "./invoice-row-actions";
import {
  RecordDetailsDrawer,
  RecordDetailsSection,
  RecordDetailsField,
} from "@/components/RecordDetailsDrawer";

export type DocumentType = "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";

export type InvoiceRow = {
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

function EmailedPill({ emailSentAt }: { emailSentAt: string | null }) {
  return emailSentAt ? (
    <span className="gh-admin-ops-badge inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
      Sent
    </span>
  ) : (
    <span className="gh-admin-ops-badge inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
      Pending
    </span>
  );
}

export function AdminInvoicesTable({ items }: { items: InvoiceRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [quickViewId, setQuickViewId] = useState<string | null>(
    () => searchParams.get("invoice"),
  );

  const quickViewInvoice = quickViewId
    ? items.find((i) => i.id === quickViewId) ?? null
    : null;

  function openQuickView(id: string) {
    setQuickViewId(id);
    const next = new URLSearchParams(searchParams.toString());
    next.set("invoice", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <>
      <div
        className="gh-admin-ops-table-wrap gh-cpt-table-wrap overflow-x-auto"
        style={{ minWidth: 0 }}
      >
        <div style={{ minWidth: 600 }}>
          <AdminTable>
            <Thead>
              <Th>Invoice #</Th>
              <Th>Patient</Th>
              <Th align="right">Amount</Th>
              <Th>Emailed</Th>
              <Th align="right" style={{ width: 150 }}>
                {" "}
              </Th>
            </Thead>
            <tbody>
              {items.map((inv) => (
                <Tr
                  key={inv.id}
                  onClick={() => openQuickView(inv.id)}
                  className="gh-admin-invoices-row cursor-pointer"
                >
                  <Td>
                    <span className="font-mono text-[13px] font-bold text-[var(--color-text-primary)]">
                      {inv.invoiceNumber}
                    </span>
                  </Td>
                  <Td>
                    <p className="font-semibold text-[var(--color-text-primary)]">{inv.fullName}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">{inv.email}</p>
                  </Td>
                  <Td align="right">
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {formatPrice(inv.totalCents, inv.currencyCode)}
                    </span>
                  </Td>
                  <Td>
                    <EmailedPill emailSentAt={inv.emailSentAt} />
                  </Td>
                  <Td align="right" onClick={(e) => e.stopPropagation()}>
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
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </AdminTable>
        </div>
      </div>

      <div className="gh-admin-mobile-list gh-cpt-mobile-list">
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

      <RecordDetailsDrawer
        open={quickViewInvoice !== null}
        onOpenChange={(next) => {
          if (!next) setQuickViewId(null);
        }}
        paramKey="invoice"
        paramValue={quickViewInvoice?.id}
        title={quickViewInvoice ? quickViewInvoice.invoiceNumber : ""}
        summary={
          quickViewInvoice ? (
            <div className="gh-order-drawer-summary flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="font-semibold text-[var(--portal-text)]">
                {quickViewInvoice.fullName}
              </span>
              <span>{formatPrice(quickViewInvoice.totalCents, quickViewInvoice.currencyCode)}</span>
              <EmailedPill emailSentAt={quickViewInvoice.emailSentAt} />
            </div>
          ) : null
        }
        footer={
          quickViewInvoice ? (
            <>
              <a
                href={`/api/admin/invoices/${quickViewInvoice.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="gh-btn gh-btn-secondary"
              >
                Download
              </a>
              <InvoiceRowActions invoiceId={quickViewInvoice.id} />
            </>
          ) : null
        }
      >
        {quickViewInvoice ? (
          <>
            <RecordDetailsSection title="Billing">
              <RecordDetailsField
                label="Type"
                value={<DocTypeBadge documentType={quickViewInvoice.documentType} />}
              />
              <RecordDetailsField
                label="Order"
                value={
                  <Link
                    href={`/admin/orders/${quickViewInvoice.orderId}`}
                    className="font-mono text-xs text-[var(--color-brand-primary)] hover:underline"
                  >
                    {quickViewInvoice.orderNumber ?? quickViewInvoice.orderId.slice(0, 8)}
                  </Link>
                }
              />
              <RecordDetailsField
                label="Country"
                value={
                  <span className="inline-flex items-center gap-2">
                    <FlagBadge code={quickViewInvoice.countryCode} size={14} />
                    {quickViewInvoice.countryCode.toUpperCase()}
                  </span>
                }
              />
            </RecordDetailsSection>

            <RecordDetailsSection title="Delivery">
              <RecordDetailsField label="Generated" value={formatAppDate(quickViewInvoice.generatedAt)} />
              <RecordDetailsField
                label="Emailed"
                value={
                  quickViewInvoice.emailSentAt
                    ? `Sent ${formatAppDate(quickViewInvoice.emailSentAt)}`
                    : "Pending"
                }
              />
            </RecordDetailsSection>

            <RecordDetailsSection title="Files">
              <Link
                href={`/print/order-invoices/${quickViewInvoice.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                Open printable invoice
              </Link>
            </RecordDetailsSection>
          </>
        ) : null}
      </RecordDetailsDrawer>
    </>
  );
}

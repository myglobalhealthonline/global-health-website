"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink, FileText } from "lucide-react";
import { formatPrice } from "@/lib/format-currency";
import { formatAppDate } from "@/lib/format-datetime";
import { FlagBadge } from "../../_components/flag-badge";
import { InvoiceRowActions } from "./invoice-row-actions";

export type DocumentType = "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";

/** One fiscal document (invoice / receipt / invoice-receipt / credit note). */
export type InvoiceDocument = {
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
  /**
   * Portugal: the document is InvoiceExpress's, mirrored into our storage as a
   * PDF. There is no print page for it — Download serves the stored file.
   */
  hasStoredPdf?: boolean;
  /** InvoiceExpress's own document link, for support staff working in their UI. */
  invoiceExpressPermalink?: string | null;
};

/** An order and every fiscal document linked to it. */
export type InvoiceOrderGroup = {
  orderId: string;
  orderNumber: string | null;
  fullName: string;
  email: string;
  countryCode: string;
  totalCents: number;
  currencyCode: string;
  paymentStatus: string;
  documents: InvoiceDocument[];
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
      className={`gh-admin-ops-badge inline-block rounded-full px-2 py-0.5 text-portal-micro font-bold uppercase ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function EmailedPill({ emailSentAt }: { emailSentAt: string | null }) {
  return emailSentAt ? (
    <span className="gh-admin-ops-badge inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-portal-micro font-bold uppercase text-emerald-800">
      Sent
    </span>
  ) : (
    <span className="gh-admin-ops-badge inline-block rounded-full bg-amber-100 px-2 py-0.5 text-portal-micro font-bold uppercase text-amber-800">
      Pending
    </span>
  );
}

/** One document row inside an expanded order: title + status + per-document actions. */
function DocumentRow({ doc }: { doc: InvoiceDocument }) {
  return (
    <div className="gh-admin-invoice-doc-row flex flex-col gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <DocTypeBadge documentType={doc.documentType} />
        <span className="font-mono text-portal-compact font-bold text-[var(--color-text-primary)]">
          {doc.invoiceNumber}
        </span>
        <span className="text-portal-thead text-[var(--color-text-muted)]">
          {formatAppDate(doc.generatedAt)}
        </span>
        <EmailedPill emailSentAt={doc.emailSentAt} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {/* Portugal has no print page — the document is InvoiceExpress's, and we
            hold the finished PDF rather than the data to draw one. Its View
            opens InvoiceExpress's own copy when we have the link; otherwise
            Download (the stored file) is the only action. */}
        {doc.hasStoredPdf ? (
          doc.invoiceExpressPermalink ? (
            <a
              href={doc.invoiceExpressPermalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-portal-thead font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
            >
              <ExternalLink className="size-3" aria-hidden />
              View
            </a>
          ) : null
        ) : (
          <Link
            href={`/print/order-invoices/${doc.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-white px-3 py-1.5 text-portal-thead font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
          >
            <ExternalLink className="size-3" aria-hidden />
            View
          </Link>
        )}
        {/* Download + Send-to-patient (email / WhatsApp) — one document each. */}
        <InvoiceRowActions invoiceId={doc.id} />
      </div>
    </div>
  );
}

function OrderRow({ group, defaultOpen }: { group: InvoiceOrderGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const sentCount = group.documents.filter((d) => d.emailSentAt).length;
  const docCount = group.documents.length;

  return (
    <div className="gh-admin-invoice-order border-b border-[var(--color-border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="gh-admin-invoice-order-head flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--color-bg-subtle)]"
      >
        <ChevronRight
          className={`size-4 shrink-0 text-[var(--color-text-muted)] transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        />
        <span className="inline-flex items-center gap-2">
          <FlagBadge code={group.countryCode} size={14} />
          <span className="font-mono text-portal-compact font-bold text-[var(--color-text-primary)]">
            {group.orderNumber ?? group.orderId.slice(0, 8)}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-[var(--color-text-primary)]">
            {group.fullName}
          </span>
          <span className="block truncate text-portal-thead text-[var(--color-text-muted)]">
            {group.email}
          </span>
        </span>
        <span className="hidden items-center gap-2 sm:inline-flex">
          <span className="gh-admin-ops-badge inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-portal-micro font-bold uppercase text-[var(--color-text-muted)]">
            <FileText className="size-3" aria-hidden />
            {docCount} {docCount === 1 ? "doc" : "docs"}
          </span>
          <span className="gh-admin-ops-badge inline-block rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-portal-micro font-bold uppercase text-[var(--color-text-muted)]">
            {sentCount}/{docCount} sent
          </span>
        </span>
        <span className="w-20 shrink-0 text-right font-semibold text-[var(--color-text-primary)]">
          {formatPrice(group.totalCents, group.currencyCode)}
        </span>
      </button>

      {open ? (
        <div className="gh-admin-invoice-order-body flex flex-col gap-2 bg-[var(--color-bg-subtle)] px-4 pb-4 pt-1">
          {group.documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminInvoiceOrdersTable({ orders }: { orders: InvoiceOrderGroup[] }) {
  return (
    <div className="gh-admin-invoice-orders">
      {orders.map((group, i) => (
        // Auto-open the first order so the grouped/expandable layout is obvious
        // at a glance on landing.
        <OrderRow key={group.orderId} group={group} defaultOpen={i === 0} />
      ))}
    </div>
  );
}

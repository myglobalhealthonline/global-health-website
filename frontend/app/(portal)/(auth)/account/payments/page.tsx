import Link from "next/link";
import {
  CreditCard,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Download,
} from "lucide-react";
import { fetchAccountPayments, type AccountPayment } from "@/lib/api/account-payments-api";
import { fetchAccountInvoices, type AccountInvoice } from "@/lib/api/account-invoices-api";
import { getServerInvoices } from "@/lib/api/me-subscription-server";
import type { SubscriptionInvoiceView } from "@/lib/api/me-subscription";
import { formatAppDate } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { getPortalLocale } from "@/lib/i18n/get-portal-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { ReceiptButton } from "./_components/receipt-button";
import { PayNowButton } from "./_components/pay-now-button";
import { AdminSummaryStrip, PageHeader } from "@/components/portal-atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";

export const dynamic = "force-dynamic";

const NEEDS_ACTION_STATUSES = new Set(["FAILED", "REQUIRES_ACTION", "UNPAID"]);

const STATUS_PILL: Record<AccountPayment["status"], string> = {
  PAID: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  PROCESSING: "bg-amber-50 text-amber-800 border border-amber-200",
  REQUIRES_ACTION: "bg-amber-50 text-amber-800 border border-amber-200",
  REFUNDED: "bg-slate-100 text-slate-700 border border-slate-200",
  FAILED: "bg-rose-50 text-rose-800 border border-rose-200",
  CANCELED: "bg-slate-100 text-slate-600 border border-slate-200",
  UNPAID: "bg-slate-100 text-slate-600 border border-slate-200",
};

// Membership invoice status -> pill tone (mirrors STATUS_PILL above for consultation
// payments). Unmapped/null Stripe status falls back to an info tone, never blank.
const INVOICE_STATUS_PILL: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  open: "bg-amber-50 text-amber-800 border border-amber-200",
  void: "bg-slate-100 text-slate-700 border border-slate-200",
  uncollectible: "bg-rose-50 text-rose-800 border border-rose-200",
};
const INVOICE_STATUS_FALLBACK_PILL = "bg-sky-50 text-sky-800 border border-sky-200";

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AccountPaymentsPage() {
  const [result, invoicesData, ghInvoicesResult, locale] = await Promise.all([
    fetchAccountPayments(),
    getServerInvoices(),
    fetchAccountInvoices(),
    getPortalLocale(),
  ]);
  const { account: a, subscription } = loadLocaleBundle(locale);
  const items = result.ok ? result.data.items : [];
  const unavailable = result.ok ? null : result.message;
  const invoices = invoicesData?.invoices ?? [];
  const inv = subscription.invoice;
  // Global Health's own billing documents for consultation/product orders.
  // Distinct from `invoices` above, which are Stripe membership invoices.
  const ghInvoices = ghInvoicesResult.ok ? ghInvoicesResult.data.items : [];

  const invoiceStatusLabel = (status: string | null): string => {
    switch ((status ?? "").toLowerCase()) {
      case "paid":
        return inv.status_paid;
      case "open":
        return inv.status_open;
      case "void":
        return inv.status_void;
      case "uncollectible":
        return inv.status_uncollectible;
      default:
        // Unknown/unfinalized Stripe status (or null): never render a blank pill.
        // Known-but-unmapped strings get a readable fallback; missing status gets
        // the explicit "processing" copy.
        return status ? titleCase(status) : inv.status_processing;
    }
  };

  const invoiceStatusTone = (status: string | null): string =>
    INVOICE_STATUS_PILL[(status ?? "").toLowerCase()] ?? INVOICE_STATUS_FALLBACK_PILL;

  const statusLabel: Record<AccountPayment["status"], string> = {
    PAID: a.payments.statusPaid,
    PROCESSING: a.payments.statusProcessing,
    REQUIRES_ACTION: a.payments.statusActionRequired,
    REFUNDED: a.payments.statusRefunded,
    FAILED: a.payments.statusFailed,
    CANCELED: a.payments.statusCanceled,
    UNPAID: a.payments.statusUnpaid,
  };
  const paidCount =
    items.filter((item) => item.status === "PAID").length +
    invoices.filter((row) => (row.status ?? "").toLowerCase() === "paid").length;
  const actionCount = items.filter(
    (item) => item.status === "FAILED" || item.status === "REQUIRES_ACTION" || item.status === "UNPAID",
  ).length;
  const receiptsCount = items.length + invoices.length + ghInvoices.length;
  const lastPayment = [...items]
    .sort((aItem, bItem) => new Date(bItem.paidAt).getTime() - new Date(aItem.paidAt).getTime())[0];

  const paymentFields: ColumnPriorityField<AccountPayment>[] = [
    {
      key: "date",
      label: a.payments.colDate,
      priority: 2,
      render: (payment) => formatAppDate(payment.paidAt),
    },
    {
      key: "consultation",
      label: a.payments.colConsultation,
      priority: 1,
      cardPrimary: true,
      render: (payment) => (
        <>
          <span className="block font-semibold text-[var(--portal-text)]">
            {payment.serviceName ?? payment.consultationType}
          </span>
          {payment.doctorName ? (
            <span className="block text-xs text-[var(--portal-muted)]">
              {/^dr\.?\s/i.test(payment.doctorName)
                ? payment.doctorName
                : `Dr. ${payment.doctorName}`}
            </span>
          ) : null}
          <span className="block text-xs text-[var(--portal-muted)]">{payment.countryCode}</span>
        </>
      ),
    },
    {
      key: "amount",
      label: a.payments.colAmount,
      priority: 2,
      render: (payment) => (
        <span
          className="font-semibold text-[var(--portal-text)]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatPrice(payment.amountCents, payment.currencyCode)}
        </span>
      ),
    },
    {
      key: "status",
      label: a.payments.colStatus,
      priority: 2,
      render: (payment) => (
        <>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[payment.status]}`}
          >
            {statusLabel[payment.status]}
          </span>
          {payment.status === "REFUNDED" ? (
            <p className="mt-1 text-portal-thead text-[var(--portal-muted)]">
              {a.payments.refundedNote}
            </p>
          ) : null}
        </>
      ),
    },
    {
      key: "receipt",
      label: a.payments.colReceipt,
      priority: 2,
      align: "right",
      desktopOnly: true,
      render: (payment) =>
        NEEDS_ACTION_STATUSES.has(payment.status) ? (
          <PayNowButton appointmentId={payment.appointmentId} i18n={a.payments} />
        ) : (
          <ReceiptButton paymentId={payment.id} i18n={a.payments} />
        ),
    },
  ];

  const ghDocLabel = (row: AccountInvoice): string => {
    switch (row.documentType) {
      case "CREDIT_NOTE":
        return a.payments.docCreditNote;
      case "RECEIPT":
        return a.payments.docReceipt;
      case "INVOICE_RECEIPT":
        return a.payments.docInvoiceReceipt;
      default:
        return a.payments.docInvoice;
    }
  };

  /**
   * Portugal's document is InvoiceExpress's Fatura-Recibo, stored as a PDF —
   * there is no print page to open, because we hold the finished file rather
   * than the data to draw one. Those rows get a single Download action; every
   * other market keeps View (print page) + Download.
   */
  const ghStoredPdfHref = (row: AccountInvoice) => `/api/account/invoices/${row.id}/pdf`;

  const ghInvoiceFields: ColumnPriorityField<AccountInvoice>[] = [
    {
      key: "date",
      label: a.payments.colDate,
      priority: 2,
      render: (row) => formatAppDate(row.generatedAt),
    },
    {
      key: "document",
      label: a.payments.colDocument,
      priority: 1,
      cardPrimary: true,
      render: (row) => (
        <>
          <span className="block font-semibold text-[var(--portal-text)]">
            {ghDocLabel(row)} · {row.invoiceNumber}
          </span>
          {row.description ? (
            <span className="block text-xs text-[var(--portal-muted)]">{row.description}</span>
          ) : null}
        </>
      ),
    },
    {
      key: "amount",
      label: a.payments.colAmount,
      priority: 2,
      render: (row) => (
        <span
          className="font-semibold text-[var(--portal-text)]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatPrice(row.totalCents, row.currencyCode)}
        </span>
      ),
    },
    {
      key: "actions",
      label: a.payments.colReceipt,
      priority: 2,
      align: "right",
      desktopOnly: true,
      render: (row) => (
        <span className="inline-flex items-center gap-3">
          {!row.hasStoredPdf && (
            <Link
              href={`/print/order-invoices/${row.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--portal-primary)] hover:underline"
            >
              {a.payments.viewInvoice}
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          )}
          {/* Plain anchor: the backend sends Content-Disposition: attachment,
              so the browser saves the real PDF with no JavaScript. */}
          <a
            href={ghStoredPdfHref(row)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--portal-primary)] hover:underline"
          >
            {a.payments.downloadInvoice}
            <Download className="size-3.5" aria-hidden />
          </a>
        </span>
      ),
    },
  ];

  const invoiceFields: ColumnPriorityField<SubscriptionInvoiceView>[] = [
    {
      key: "date",
      label: inv.colDate,
      priority: 2,
      render: (invoice) => formatAppDate(invoice.periodStart ?? invoice.createdAt),
    },
    {
      key: "description",
      label: inv.colDescription,
      priority: 1,
      cardPrimary: true,
      render: (invoice) => (
        <>
          <span className="block font-semibold text-[var(--portal-text)]">{inv.membershipPayment}</span>
          {invoice.number ? (
            <span className="block text-xs text-[var(--portal-muted)]">{invoice.number}</span>
          ) : null}
        </>
      ),
    },
    {
      key: "amount",
      label: inv.colAmount,
      priority: 2,
      render: (invoice) => (
        <span
          className="font-semibold text-[var(--portal-text)]"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatPrice(invoice.amountPaidCents, invoice.currency)}
        </span>
      ),
    },
    {
      key: "status",
      label: inv.colStatus,
      priority: 2,
      render: (invoice) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${invoiceStatusTone(invoice.status)}`}
        >
          {invoiceStatusLabel(invoice.status)}
        </span>
      ),
    },
    {
      key: "invoice",
      label: inv.viewInvoice,
      priority: 2,
      align: "right",
      desktopOnly: true,
      // Points at OUR document, not Stripe's hosted invoice page, so a patient
      // sees one consistent Global Health document in their market's language.
      // Stripe is still the system of record for membership numbering and VAT —
      // this is a presentation change only.
      render: (invoice) => (
        <span className="inline-flex items-center gap-3">
          <Link
            href={`/print/subscription-invoices/${invoice.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--portal-primary)] hover:underline"
          >
            {a.payments.viewInvoice}
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
          <a
            href={`/api/account/subscription-invoices/${invoice.id}/pdf`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--portal-primary)] hover:underline"
          >
            {a.payments.downloadInvoice}
            <Download className="size-3.5" aria-hidden />
          </a>
        </span>
      ),
    },
  ];

  return (
    <div className="gh-patient-page gh-patient-payments-page">
      <PageHeader
        eyebrow={a.payments.breadcrumb}
        title={
          <span className="inline-flex items-center gap-2">
            <CreditCard className="size-6 text-[var(--portal-primary)]" aria-hidden />
            {a.payments.title}
          </span>
        }
        description={a.payments.subtitle}
      />

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: a.payments.sumReceipts, value: String(receiptsCount), hint: a.payments.sumReceiptsHint, icon: <FileText aria-hidden /> },
          { label: a.payments.sumPaid, value: String(paidCount), hint: a.payments.sumPaidHint, icon: <CheckCircle2 aria-hidden /> },
          { label: a.payments.sumNeedsAction, value: String(actionCount), hint: a.payments.sumNeedsActionHint, icon: <AlertCircle aria-hidden /> },
          { label: a.payments.sumLatest, value: lastPayment ? formatAppDate(lastPayment.paidAt) : a.payments.noneYet, hint: a.payments.sumLatestHint, icon: <Clock3 aria-hidden /> },
        ]}
      />

      {unavailable ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {unavailable}
        </div>
      ) : null}

      {items.length === 0 && invoices.length === 0 && ghInvoices.length === 0 && !unavailable ? (
        <div className="gh-patient-empty-state gh-card flex flex-col items-center p-10 text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CreditCard aria-hidden className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[var(--portal-text)]">{a.payments.noPayments}</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--portal-muted)]">{a.payments.noPaymentsBody}</p>
          <Link
            href="/account/bookings"
            className="mt-5 inline-flex items-center rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            {a.payments.viewBookings}
          </Link>
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="gh-card overflow-hidden p-0">
          <ColumnPriorityTable
            fields={paymentFields}
            rows={items}
            getRowKey={(payment) => payment.id}
            cardActions={(payment) =>
              NEEDS_ACTION_STATUSES.has(payment.status) ? (
                <PayNowButton appointmentId={payment.appointmentId} i18n={a.payments} />
              ) : (
                <ReceiptButton paymentId={payment.id} i18n={a.payments} />
              )
            }
          />
        </div>
      ) : null}

      {ghInvoices.length > 0 ? (
        <section className="mt-8">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
            {a.payments.invoicesHeading}
          </h3>
          <p className="mb-3 mt-1 text-xs text-[var(--portal-muted)]">
            {a.payments.invoicesHint}
          </p>
          <div className="gh-card overflow-hidden p-0">
            <ColumnPriorityTable
              fields={ghInvoiceFields}
              rows={ghInvoices}
              getRowKey={(row) => row.id}
              cardActions={(row) => (
                <>
                  {!row.hasStoredPdf && (
                    <Link
                      href={`/print/order-invoices/${row.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--portal-primary)]"
                    >
                      {a.payments.viewInvoice}
                      <ExternalLink className="size-3.5" aria-hidden />
                    </Link>
                  )}
                  <a
                    href={ghStoredPdfHref(row)}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--portal-primary)]"
                  >
                    {a.payments.downloadInvoice}
                    <Download className="size-3.5" aria-hidden />
                  </a>
                </>
              )}
            />
          </div>
        </section>
      ) : null}

      {invoices.length > 0 ? (
        <section className="mt-8">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
            {inv.heading}
          </h3>
          <div className="gh-card overflow-hidden p-0">
            <ColumnPriorityTable
              fields={invoiceFields}
              rows={invoices}
              getRowKey={(invoice) => invoice.id}
              cardActions={(invoice) => (
                <>
                  <Link
                    href={`/print/subscription-invoices/${invoice.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--portal-primary)]"
                  >
                    {a.payments.viewInvoice}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </Link>
                  <a
                    href={`/api/account/subscription-invoices/${invoice.id}/pdf`}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] bg-[var(--portal-surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--portal-primary)]"
                  >
                    {a.payments.downloadInvoice}
                    <Download className="size-3.5" aria-hidden />
                  </a>
                </>
              )}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

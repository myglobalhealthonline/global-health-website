import Link from "next/link";
import { CreditCard, ExternalLink, ReceiptText } from "lucide-react";
import { fetchAccountPayments, type AccountPayment } from "@/lib/api/account-payments-api";
import { getServerInvoices } from "@/lib/api/me-subscription-server";
import { formatAppDate } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { ReceiptButton } from "./_components/receipt-button";
import { AdminSummaryStrip } from "@/components/portal-atoms";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<AccountPayment["status"], string> = {
  PAID: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  PROCESSING: "bg-amber-50 text-amber-800 border border-amber-200",
  REQUIRES_ACTION: "bg-amber-50 text-amber-800 border border-amber-200",
  REFUNDED: "bg-slate-100 text-slate-700 border border-slate-200",
  FAILED: "bg-rose-50 text-rose-800 border border-rose-200",
  CANCELED: "bg-slate-100 text-slate-600 border border-slate-200",
  UNPAID: "bg-slate-100 text-slate-600 border border-slate-200",
};

export default async function AccountPaymentsPage() {
  const [result, invoicesData, locale] = await Promise.all([
    fetchAccountPayments(),
    getServerInvoices(),
    getPageLocale(),
  ]);
  const { account: a, subscription } = loadLocaleBundle(locale);
  const items = result.ok ? result.data.items : [];
  const unavailable = result.ok ? null : result.message;
  const invoices = invoicesData?.invoices ?? [];
  const inv = subscription.invoice;

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
        return status ?? "";
    }
  };

  const statusLabel: Record<AccountPayment["status"], string> = {
    PAID: a.payments.statusPaid,
    PROCESSING: a.payments.statusProcessing,
    REQUIRES_ACTION: a.payments.statusActionRequired,
    REFUNDED: a.payments.statusRefunded,
    FAILED: a.payments.statusFailed,
    CANCELED: a.payments.statusCanceled,
    UNPAID: a.payments.statusUnpaid,
  };
  const paidCount = items.filter((item) => item.status === "PAID").length + invoices.filter((row) => (row.status ?? "").toLowerCase() === "paid").length;
  const actionCount = items.filter((item) => item.status === "FAILED" || item.status === "REQUIRES_ACTION" || item.status === "UNPAID").length;
  const receiptsCount = items.length + invoices.length;
  const lastPayment = [...items]
    .sort((aItem, bItem) => new Date(bItem.paidAt).getTime() - new Date(aItem.paidAt).getTime())[0];

  return (
    <div className="gh-patient-page gh-patient-payments-page">
      <header className="gh-patient-page-header mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--portal-muted)]">
          {a.payments.breadcrumb}
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--portal-text)]">
          <CreditCard className="size-6 text-[var(--portal-primary)]" aria-hidden />
          {a.payments.title}
        </h2>
        <p className="text-sm text-[var(--portal-muted)]">
          {a.payments.subtitle}
        </p>
      </header>

      <AdminSummaryStrip
        className="mb-5"
        items={[
          { label: "Receipts", value: String(receiptsCount), hint: "Payments and membership invoices" },
          { label: "Paid", value: String(paidCount), hint: "Completed payment records" },
          { label: "Needs action", value: String(actionCount), hint: "Failed, unpaid, or action required" },
          { label: "Latest", value: lastPayment ? formatAppDate(lastPayment.paidAt) : "None yet", hint: "Most recent consultation payment" },
        ]}
      />

      {unavailable ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {unavailable}
        </div>
      ) : null}

      {items.length === 0 && invoices.length === 0 && !unavailable ? (
        <div className="gh-patient-empty-state gh-card flex flex-col items-center p-10 text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CreditCard aria-hidden className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[var(--portal-text)]">
            {a.payments.noPayments}
          </h2>
          <p className="mt-2 max-w-md text-sm text-[var(--portal-muted)]">
            {a.payments.noPaymentsBody}
          </p>
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
          <div className="grid gap-3 p-4 md:hidden">
            {items.map((p) => (
              <article
                key={p.id}
                className="rounded-lg border border-[var(--portal-line)] bg-[var(--portal-well)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--portal-text)]">
                      {p.serviceName ?? p.consultationType}
                    </p>
                    <p className="mt-1 text-xs text-[var(--portal-muted)]">
                      {formatAppDate(p.paidAt)} · {p.countryCode}
                    </p>
                    {p.doctorName ? (
                      <p className="mt-1 text-xs text-[var(--portal-muted)]">
                        {/^dr\.?\s/i.test(p.doctorName) ? p.doctorName : `Dr. ${p.doctorName}`}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[p.status]}`}
                  >
                    {statusLabel[p.status]}
                  </span>
                </div>
                {p.status === "REFUNDED" ? (
                  <p className="mt-2 text-xs" style={{ color: "var(--portal-muted)" }}>
                    This payment was refunded. It can take a few business days to appear on your statement.
                  </p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p
                    className="text-lg font-extrabold text-[var(--portal-text)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatPrice(p.amountCents, p.currencyCode)}
                  </p>
                  <ReceiptButton paymentId={p.id} />
                </div>
              </article>
            ))}
          </div>
          <div className="gh-patient-table-wrap hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[var(--portal-well)] text-left text-xs uppercase tracking-wide text-[var(--portal-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">{a.payments.colDate}</th>
                <th className="px-4 py-3 font-semibold">{a.payments.colConsultation}</th>
                <th className="px-4 py-3 font-semibold">{a.payments.colAmount}</th>
                <th className="px-4 py-3 font-semibold">{a.payments.colStatus}</th>
                <th className="px-4 py-3 text-right font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--portal-line)]">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-[var(--portal-text)]">
                    {formatAppDate(p.paidAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--portal-text)]">
                    <span className="block font-semibold">
                      {p.serviceName ?? p.consultationType}
                    </span>
                    {p.doctorName && (
                      <span className="block text-xs text-[var(--portal-muted)]">
                        {/^dr\.?\s/i.test(p.doctorName) ? p.doctorName : `Dr. ${p.doctorName}`}
                      </span>
                    )}
                    <span className="block text-xs text-[var(--portal-muted)]">
                      {p.countryCode}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 font-semibold text-[var(--portal-text)]"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatPrice(p.amountCents, p.currencyCode)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[p.status]}`}
                    >
                      {statusLabel[p.status]}
                    </span>
                    {p.status === "REFUNDED" ? (
                      <p className="mt-1 text-[11px]" style={{ color: "var(--portal-muted)" }}>
                        Refunded — a few days to appear on your statement.
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReceiptButton paymentId={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      ) : null}

      {invoices.length > 0 ? (
        <section className="mt-8">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
            {inv.heading}
          </h3>
          <div className="gh-card overflow-hidden p-0">
            <div className="grid gap-3 p-4 md:hidden">
              {invoices.map((row) => {
                const receiptUrl = row.hostedInvoiceUrl ?? row.pdfUrl;
                return (
                  <article
                    key={row.id}
                    className="rounded-lg border border-[var(--portal-line)] bg-[var(--portal-well)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold text-[var(--portal-text)]">
                          <ReceiptText className="size-4 text-[var(--portal-primary)]" aria-hidden />
                          {inv.membershipPayment}
                        </p>
                        <p className="mt-1 text-xs text-[var(--portal-muted)]">
                          {formatAppDate(row.periodStart ?? row.createdAt)}
                          {row.number ? ` · ${row.number}` : ""}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        {invoiceStatusLabel(row.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p
                        className="text-lg font-extrabold text-[var(--portal-text)]"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {formatPrice(row.amountPaidCents, row.currency)}
                      </p>
                      {receiptUrl ? (
                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--portal-primary)]"
                        >
                          {inv.viewInvoice}
                          <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="gh-patient-table-wrap hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-[var(--portal-well)] text-left text-xs uppercase tracking-wide text-[var(--portal-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">{inv.colDate}</th>
                  <th className="px-4 py-3 font-semibold">{inv.colDescription}</th>
                  <th className="px-4 py-3 font-semibold">{inv.colAmount}</th>
                  <th className="px-4 py-3 font-semibold">{inv.colStatus}</th>
                  <th className="px-4 py-3 text-right font-semibold">{inv.viewInvoice}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--portal-line)]">
                {invoices.map((row) => {
                  const receiptUrl = row.hostedInvoiceUrl ?? row.pdfUrl;
                  return (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-[var(--portal-text)]">
                        {formatAppDate(row.periodStart ?? row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-[var(--portal-text)]">
                        <span className="block font-semibold">{inv.membershipPayment}</span>
                        {row.number ? (
                          <span className="block text-xs text-[var(--portal-muted)]">{row.number}</span>
                        ) : null}
                      </td>
                      <td
                        className="px-4 py-3 font-semibold text-[var(--portal-text)]"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {formatPrice(row.amountPaidCents, row.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          {invoiceStatusLabel(row.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {receiptUrl ? (
                          <a
                            href={receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--portal-primary)] hover:underline"
                          >
                            {inv.viewInvoice}
                            <ExternalLink className="size-3.5" aria-hidden />
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--portal-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

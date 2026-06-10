import Link from "next/link";
import { CreditCard, ExternalLink } from "lucide-react";
import { fetchAccountPayments, type AccountPayment } from "@/lib/api/account-payments-api";
import { formatAppDate } from "@/lib/format-datetime";
import { formatPrice } from "@/lib/format-currency";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { ReceiptButton } from "./_components/receipt-button";

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
  const [result, locale] = await Promise.all([
    fetchAccountPayments(),
    getPageLocale(),
  ]);
  const { account: a } = loadLocaleBundle(locale);
  const items = result.ok ? result.data.items : [];
  const unavailable = result.ok ? null : result.message;

  const statusLabel: Record<AccountPayment["status"], string> = {
    PAID: a.payments.statusPaid,
    PROCESSING: a.payments.statusProcessing,
    REQUIRES_ACTION: a.payments.statusActionRequired,
    REFUNDED: a.payments.statusRefunded,
    FAILED: a.payments.statusFailed,
    CANCELED: a.payments.statusCanceled,
    UNPAID: a.payments.statusUnpaid,
  };

  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {a.payments.breadcrumb}
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <CreditCard className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
          {a.payments.title}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {a.payments.subtitle}
        </p>
      </header>

      {unavailable ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {unavailable}
        </div>
      ) : null}

      {items.length === 0 && !unavailable ? (
        <div className="gh-card flex flex-col items-center p-10 text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CreditCard aria-hidden className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[var(--color-text-primary)]">
            {a.payments.noPayments}
          </h2>
          <p className="mt-2 max-w-md text-sm text-[var(--color-text-muted)]">
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
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-background-soft)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">{a.payments.colDate}</th>
                <th className="px-4 py-3 font-semibold">{a.payments.colConsultation}</th>
                <th className="px-4 py-3 font-semibold">{a.payments.colAmount}</th>
                <th className="px-4 py-3 font-semibold">{a.payments.colStatus}</th>
                <th className="px-4 py-3 text-right font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">
                    {formatAppDate(p.paidAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">
                    <span className="block font-semibold">
                      {p.serviceName ?? p.consultationType}
                    </span>
                    {p.doctorName && (
                      <span className="block text-xs text-[var(--color-text-muted)]">
                        Dr. {p.doctorName}
                      </span>
                    )}
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {p.countryCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">
                    {formatPrice(p.amountCents, p.currencyCode)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[p.status]}`}
                    >
                      {statusLabel[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReceiptButton paymentId={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

import Link from "next/link";
import { ArrowLeft, CreditCard, ExternalLink } from "lucide-react";
import { fetchAccountPayments, type AccountPayment } from "@/lib/api/account-payments-api";

export const dynamic = "force-dynamic";

function formatAmount(cents: number, currency: string): string {
  const major = (cents / 100).toFixed(2);
  const symbol =
    currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${major}`;
}

const STATUS_LABEL: Record<AccountPayment["status"], string> = {
  PAID: "Paid",
  PROCESSING: "Processing",
  REQUIRES_ACTION: "Action required",
  REFUNDED: "Refunded",
  FAILED: "Failed",
  CANCELED: "Canceled",
  UNPAID: "Unpaid",
};

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
  const result = await fetchAccountPayments();
  const items = result.ok ? result.data.items : [];
  const unavailable = result.ok ? null : result.message;

  return (
    <div className="min-h-screen bg-[var(--color-background-soft)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/account"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Back to account
        </Link>

        <div className="flex items-center gap-2">
          <CreditCard className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Payments</h1>
        </div>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Receipts for consultations you&apos;ve booked. Stripe sends an email
          receipt the moment a charge clears — this page is the running log.
        </p>

        {unavailable ? (
          <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {unavailable}
          </div>
        ) : null}

        {items.length === 0 && !unavailable ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <CreditCard aria-hidden className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">No payments yet</h2>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              Once you complete a paid booking the receipt lands here. Free
              consultations don&apos;t appear in this list.
            </p>
            <Link
              href="/account/bookings"
              className="mt-5 inline-flex items-center rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              View bookings
            </Link>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Consultation</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Booking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(p.paidAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="block font-semibold text-slate-900">{p.consultationType}</span>
                      <span className="block text-xs text-slate-500">{p.countryCode}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatAmount(p.amountCents, p.currencyCode)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href="/account/bookings"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        View <ExternalLink className="size-3" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}

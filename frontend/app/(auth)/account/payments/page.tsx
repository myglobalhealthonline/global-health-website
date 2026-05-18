import Link from "next/link";
import { CreditCard, ExternalLink } from "lucide-react";
import { fetchAccountPayments, type AccountPayment } from "@/lib/api/account-payments-api";
import { formatAppDate } from "@/lib/format-datetime";

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
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Account
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <CreditCard className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
          Payments
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Receipts for consultations you&apos;ve booked. Stripe sends an email
          receipt the moment a charge clears — this page is the running log.
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
            No payments yet
          </h2>
          <p className="mt-2 max-w-md text-sm text-[var(--color-text-muted)]">
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
        <div className="gh-card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-background-soft)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Consultation</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">
                    {formatAppDate(p.paidAt)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-primary)]">
                    <span className="block font-semibold">{p.consultationType}</span>
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {p.countryCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">
                    {formatAmount(p.amountCents, p.currencyCode)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_PILL[p.status]}`}
                    >
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
    </>
  );
}

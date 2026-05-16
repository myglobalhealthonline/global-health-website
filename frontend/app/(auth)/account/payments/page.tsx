import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AccountPaymentsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background-soft)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/account"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Back to account
        </Link>

        <h1 className="gh-h2 text-[var(--color-text-primary)]">Payments</h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Receipts, saved payment methods, and subscription billing history.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CreditCard aria-hidden className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Payments coming soon</h2>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            We&apos;re wiring Stripe in a later phase. Receipts for bookings paid
            so far come directly by email until then.
          </p>
        </div>
      </div>
    </div>
  );
}

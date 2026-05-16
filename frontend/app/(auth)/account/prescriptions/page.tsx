import Link from "next/link";
import { ArrowLeft, PillBottle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AccountPrescriptionsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background-soft)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/account"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Back to account
        </Link>

        <h1 className="gh-h2 text-[var(--color-text-primary)]">Prescriptions</h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          A history of prescriptions issued during your consultations.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <PillBottle aria-hidden className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">No prescriptions yet</h2>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Prescriptions issued by our doctors will appear here. This surface
            comes online when prescription delivery integrates with bookings.
          </p>
          <Link
            href="/account/bookings"
            className="mt-5 inline-flex items-center rounded-md border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            View bookings instead
          </Link>
        </div>
      </div>
    </div>
  );
}

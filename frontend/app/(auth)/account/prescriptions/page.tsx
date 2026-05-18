import Link from "next/link";
import { PillBottle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AccountPrescriptionsPage() {
  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Account
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
          <PillBottle className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
          Prescriptions
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          A history of prescriptions issued during your consultations.
        </p>
      </header>

      <div className="gh-card flex flex-col items-center p-10 text-center">
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <PillBottle aria-hidden className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[var(--color-text-primary)]">
          No prescriptions yet
        </h2>
        <p className="mt-2 max-w-md text-sm text-[var(--color-text-muted)]">
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
    </>
  );
}

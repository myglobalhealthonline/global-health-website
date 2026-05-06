import Link from "next/link";
import { Stethoscope, CalendarDays, Settings } from "lucide-react";
import { AccountSummary } from "./ui";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background-soft)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-6 flex items-center gap-2 text-[var(--color-brand-primary)]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand-primary)] text-white">
            <Stethoscope className="size-4" aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">Global Health</span>
        </header>

        <h1 className="gh-h2 text-[var(--color-text-primary)]">My account</h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Manage your profile, track bookings, and book new consultations.
        </p>

        {/* Profile + actions */}
        <div className="mt-6 space-y-4">
          <AccountSummary />

          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/account/bookings" className="gh-card gh-card-interactive flex items-center gap-4 p-5">
              <span className="gh-icon-circle">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">My bookings</p>
                <p className="text-xs text-[var(--color-text-muted)]">View history</p>
              </div>
            </Link>

            <Link href="/book-online" className="gh-card gh-card-interactive flex items-center gap-4 p-5">
              <span className="gh-icon-circle">
                <Stethoscope className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Book consultation</p>
                <p className="text-xs text-[var(--color-text-muted)]">New request</p>
              </div>
            </Link>

            <button
              type="button"
              className="gh-card flex cursor-not-allowed items-center gap-4 p-5 opacity-60"
              disabled
              aria-disabled="true"
            >
              <span className="gh-icon-circle opacity-60">
                <Settings className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-muted)]">Settings</p>
                <p className="text-xs text-[var(--color-text-muted)]">Coming soon</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

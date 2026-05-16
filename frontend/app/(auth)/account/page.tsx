import Link from "next/link";
import {
  Stethoscope,
  CalendarDays,
  CreditCard,
  PillBottle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
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

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Link href="/account/profile" className="gh-card gh-card-interactive flex items-center gap-4 p-5">
              <span className="gh-icon-circle">
                <UserRound className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Profile</p>
                <p className="text-xs text-[var(--color-text-muted)]">Name, phone</p>
              </div>
            </Link>

            <Link href="/account/bookings" className="gh-card gh-card-interactive flex items-center gap-4 p-5">
              <span className="gh-icon-circle">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">My bookings</p>
                <p className="text-xs text-[var(--color-text-muted)]">View history</p>
              </div>
            </Link>

            <Link href="/account/prescriptions" className="gh-card gh-card-interactive flex items-center gap-4 p-5">
              <span className="gh-icon-circle">
                <PillBottle className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Prescriptions</p>
                <p className="text-xs text-[var(--color-text-muted)]">Issued meds</p>
              </div>
            </Link>

            <Link href="/account/payments" className="gh-card gh-card-interactive flex items-center gap-4 p-5">
              <span className="gh-icon-circle">
                <CreditCard className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Payments</p>
                <p className="text-xs text-[var(--color-text-muted)]">Receipts</p>
              </div>
            </Link>

            <Link href="/account/security" className="gh-card gh-card-interactive flex items-center gap-4 p-5">
              <span className="gh-icon-circle">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Security</p>
                <p className="text-xs text-[var(--color-text-muted)]">Password, email</p>
              </div>
            </Link>
          </div>

          <Link
            href="/"
            className="gh-card gh-card-interactive flex items-center gap-4 p-5"
          >
            <span className="gh-icon-circle">
              <Stethoscope className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">Book a consultation</p>
              <p className="text-xs text-[var(--color-text-muted)]">Start a new visit</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

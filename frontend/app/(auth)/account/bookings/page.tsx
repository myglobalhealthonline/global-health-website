import Link from "next/link";
import { CalendarDays, Stethoscope } from "lucide-react";
import { BookingsShell } from "./ui";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";

export const dynamic = "force-dynamic";

export default async function AccountBookingsPage() {
  const history = await fetchAccountAppointments();

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

        <div className="gh-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-[var(--color-brand-primary)]" aria-hidden />
                <h1 className="gh-h2 text-[var(--color-text-primary)]">My bookings</h1>
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Your consultation request history and status updates.
              </p>
            </div>
            <Link href="/book-online" className="gh-btn gh-btn-primary text-sm">
              Book consultation
            </Link>
          </div>

          <BookingsShell
            items={history.ok ? history.data.items : []}
            unavailableMessage={history.ok ? null : "Booking history is temporarily unavailable. Please try again soon."}
          />
        </div>
      </div>
    </div>
  );
}

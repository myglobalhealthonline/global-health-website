import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { BookingsShell } from "./ui";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";

export const dynamic = "force-dynamic";

export default async function AccountBookingsPage() {
  const history = await fetchAccountAppointments();

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Account
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[var(--color-text-primary)]">
            <CalendarDays className="size-6 text-[var(--color-brand-primary)]" aria-hidden />
            My bookings
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Your consultation request history and status updates.
          </p>
        </div>
        <Link href="/" className="gh-btn gh-btn-primary text-sm">
          Book consultation
        </Link>
      </header>

      <BookingsShell
        items={history.ok ? history.data.items : []}
        unavailableMessage={
          history.ok
            ? null
            : "Booking history is temporarily unavailable. Please try again soon."
        }
      />
    </>
  );
}

import { BookingsShell } from "./ui";
import { fetchAccountAppointments } from "@/lib/api/account-appointments-api";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AccountBookingsPage() {
  const history = await fetchAccountAppointments();

  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <article className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="gh-kicker">Patient account</p>
            <h1 className="gh-h2 mt-4 text-[var(--color-text-primary)]">My bookings</h1>
          </div>
          <Link href="/book-online" className="gh-btn gh-btn-outline">
            Book consultation
          </Link>
        </div>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Your booking request history is shown here. Payments and receipts remain coming soon.
        </p>
        <BookingsShell
          items={history.ok ? history.data.items : []}
          unavailableMessage={history.ok ? null : "Booking history is temporarily unavailable. Please try again soon."}
        />
      </article>
    </section>
  );
}

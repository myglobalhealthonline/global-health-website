import { BookingsShell } from "./ui";

export const dynamic = "force-dynamic";

export default function AccountBookingsPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <article className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">My bookings</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Booking history shell for patient accounts. Payments/receipts are coming soon.
        </p>
        <BookingsShell />
      </article>
    </section>
  );
}

import Link from "next/link";
import { AccountSummary } from "./ui";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <article className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">My account</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Patient account shell. Payments/receipts remain coming soon.
        </p>
        <AccountSummary />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/account/bookings" className="gh-btn gh-btn-primary">
            View bookings
          </Link>
          <Link href="/book-online" className="gh-link">
            Book online as guest/patient
          </Link>
        </div>
      </article>
    </section>
  );
}

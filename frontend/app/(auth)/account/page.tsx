import Link from "next/link";
import { AccountSummary } from "./ui";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <article className="gh-card p-6 sm:p-8">
        <p className="gh-kicker">Patient account</p>
        <h1 className="gh-h2 mt-5 text-[var(--color-text-primary)]">My account</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Manage your profile details and booking history. Payments and receipts are not enabled yet.
        </p>
        <AccountSummary />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link href="/account/bookings" className="gh-btn gh-btn-primary">
            My bookings
          </Link>
          <Link href="/book-online" className="gh-btn gh-btn-outline">
            Book consultation
          </Link>
          <Link href="/account" className="gh-btn gh-btn-soft">
            Account settings (coming soon)
          </Link>
        </div>
      </article>
    </section>
  );
}

import Link from "next/link";

export default function AdminHomePage() {
  return (
    <section className="gh-card p-6 sm:p-8">
      <h1 className="gh-h2 text-[var(--color-text-primary)]">Admin</h1>
      <p className="gh-body mt-3 text-[var(--color-text-muted)]">
        Internal tools only — not linked from public navigation. Token-authenticated server routes.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/admin/appointments" className="gh-btn gh-btn-primary">
          Appointment queue
        </Link>
        <Link href="/admin/countries" className="gh-btn gh-btn-primary">
          Countries
        </Link>
      </div>
    </section>
  );
}

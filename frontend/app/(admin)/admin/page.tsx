import Link from "next/link";

export default function AdminHomePage() {
  return (
    <section className="gh-card p-6 sm:p-8">
      <h1 className="gh-h2 text-[var(--color-text-primary)]">Admin Phase 2</h1>
      <p className="gh-body mt-3 text-[var(--color-text-muted)]">
        Minimal internal admin scaffold for appointment review queue. Public navigation does not link this route.
      </p>
      <div className="mt-6">
        <Link href="/admin/appointments" className="gh-btn gh-btn-primary">
          Open appointment queue
        </Link>
      </div>
    </section>
  );
}

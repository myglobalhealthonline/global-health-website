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
        <Link href="/admin/services" className="gh-btn gh-btn-primary">
          Services
        </Link>
        <Link href="/admin/doctors" className="gh-btn gh-btn-primary">
          Doctor profiles
        </Link>
        <Link href="/admin/pricing" className="gh-btn gh-btn-primary">
          Pricing
        </Link>
        <Link href="/admin/assets" className="gh-btn gh-btn-primary">
          Assets
        </Link>
        <Link href="/admin/blog-posts" className="gh-btn gh-btn-primary">
          Blog posts
        </Link>
        <Link href="/admin/faqs" className="gh-btn gh-btn-primary">
          FAQs
        </Link>
        <Link href="/admin/content-pages" className="gh-btn gh-btn-primary">
          Content pages
        </Link>
      </div>
    </section>
  );
}

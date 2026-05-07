import Link from "next/link";
import { fetchAdminCountries, fetchAdminFaqs } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function spRead(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = sp[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function AdminFaqsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const filters: Record<string, string | undefined> = {
    locale: spRead(sp, "locale"),
    countryId: spRead(sp, "countryId"),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const [faqsResult, countriesResult] = await Promise.all([
    fetchAdminFaqs(filters),
    fetchAdminCountries(),
  ]);

  if (!faqsResult.ok || !countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">FAQs</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load FAQs: {faqsResult.ok ? countriesResult.message : faqsResult.message}
        </p>
      </section>
    );
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">FAQs</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">Manage frequently asked questions by country and locale.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/faqs/new" className="gh-btn gh-btn-primary">
            New FAQ
          </Link>

        </div>
      </div>

      <form method="get" className="mt-6 grid gap-3 sm:grid-cols-5">
        <input aria-label="Search FAQs" className="gh-input" name="search" defaultValue={filters.search ?? ""} placeholder="Search question/answer" />
        <select aria-label="Filter FAQs by country" className="gh-select" name="countryId" defaultValue={filters.countryId ?? ""}>
          <option value="">All countries</option>
          {countriesResult.data.countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter FAQs by locale" className="gh-select" name="locale" defaultValue={filters.locale ?? ""}>
          <option value="">All locales</option>
          {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
            <option key={locale} value={locale}>
              {locale}
            </option>
          ))}
        </select>
        <select aria-label="Filter FAQs by activity" className="gh-select" name="isActive" defaultValue={filters.isActive ?? ""}>
          <option value="">All activity</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button type="submit" className="gh-btn gh-btn-primary">Apply</button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-3 py-2">Question</th>
              <th className="px-3 py-2">Locale</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Sort</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {faqsResult.data.items.map((faq) => (
              <tr key={faq.id} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2">{faq.question}</td>
                <td className="px-3 py-2">{faq.locale}</td>
                <td className="px-3 py-2">{faq.country?.code ?? "GLOBAL"}</td>
                <td className="px-3 py-2">{faq.sortOrder}</td>
                <td className="px-3 py-2">{faq.isActive ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/faqs/${faq.id}`} className="gh-link mr-3">View</Link>
                  <Link href={`/admin/faqs/${faq.id}/edit`} className="gh-link">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

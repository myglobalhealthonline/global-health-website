import Link from "next/link";
import {
  fetchAdminContentPages,
  fetchAdminCountries,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function spRead(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = sp[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function AdminContentPagesPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const filters: Record<string, string | undefined> = {
    locale: spRead(sp, "locale"),
    countryId: spRead(sp, "countryId"),
    status: spRead(sp, "status"),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const [pagesResult, countriesResult] = await Promise.all([
    fetchAdminContentPages(filters),
    fetchAdminCountries(),
  ]);

  if (!pagesResult.ok || !countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        Could not load content pages: {pagesResult.ok ? countriesResult.message : pagesResult.message}
      </section>
    );
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Content pages</h1>
        <Link href="/admin/content-pages/new" className="gh-btn gh-btn-primary">
          New content page
        </Link>
      </div>
      <p className="mt-3 text-sm text-amber-900">
        Legal/static pages may require approved business/legal copy. Keep public legal routes fallback-safe until approved content is confirmed.
      </p>

      <form method="get" className="mt-6 grid gap-3 sm:grid-cols-6">
        <input aria-label="Search content pages" className="gh-input" name="search" defaultValue={filters.search ?? ""} placeholder="Search key/title" />
        <select aria-label="Filter content pages by country" className="gh-select" name="countryId" defaultValue={filters.countryId ?? ""}>
          <option value="">All countries</option>
          {countriesResult.data.countries.map((country) => (
            <option key={country.id} value={country.id}>{country.name}</option>
          ))}
        </select>
        <select aria-label="Filter content pages by locale" className="gh-select" name="locale" defaultValue={filters.locale ?? ""}>
          <option value="">All locales</option>
          {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
            <option key={locale} value={locale}>{locale}</option>
          ))}
        </select>
        <select aria-label="Filter content pages by status" className="gh-select" name="status" defaultValue={filters.status ?? ""}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <select aria-label="Filter content pages by activity" className="gh-select" name="isActive" defaultValue={filters.isActive ?? ""}>
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
              <th className="px-3 py-2">Page key</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Locale</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagesResult.data.items.map((page) => (
              <tr key={page.id} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2 font-mono text-xs">{page.pageKey}</td>
                <td className="px-3 py-2">{page.title}</td>
                <td className="px-3 py-2">{page.locale}</td>
                <td className="px-3 py-2">{page.status}</td>
                <td className="px-3 py-2">{page.country?.code ?? "GLOBAL"}</td>
                <td className="px-3 py-2">{page.isActive ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/content-pages/${page.id}`} className="gh-link mr-3">View</Link>
                  <Link href={`/admin/content-pages/${page.id}/edit`} className="gh-link">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

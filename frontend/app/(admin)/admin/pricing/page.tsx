import Link from "next/link";
import { fetchAdminCountries, fetchAdminPricingPlans } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

function buildPricingHref(filters: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...filters, ...patch })) {
    if (v !== undefined && v !== "") {
      merged[k] = v;
    }
  }
  const params = new URLSearchParams(merged);
  const qs = params.toString();
  return qs ? `/admin/pricing?${qs}` : "/admin/pricing";
}

function spRead(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}


type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPricingPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const filters: Record<string, string | undefined> = {
    page: spRead(sp, "page"),
    pageSize: spRead(sp, "pageSize"),
    countryId: spRead(sp, "countryId"),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const [listResult, countriesResult] = await Promise.all([
    fetchAdminPricingPlans(filters),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Pricing</h1>
        <p className="mt-4 text-[var(--color-status-warning-text)]">Could not load countries: {countriesResult.message}</p>
      </section>
    );
  }

  if (!listResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Pricing</h1>
        <p className="mt-4 text-[var(--color-status-warning-text)]">Could not load pricing: {listResult.message}</p>
      </section>
    );
  }

  const { items, pagination } = listResult.data;
  const { page, pageSize, total, totalPages } = pagination;
  const countries = countriesResult.data.countries;
  const statusFilter = filters.isActive ?? "";

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Pricing plans</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
            Displayed pricing rows only — payments and checkout are not built yet.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/pricing/new" className="gh-btn gh-btn-primary">
            Add plan
          </Link>
          <Link href="/admin" className="gh-link text-sm text-[var(--color-text-muted)]">
            Admin home
          </Link>
        </div>
      </div>

      <form
        method="get"
        className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select name="countryId" defaultValue={filters.countryId ?? ""} className="gh-select min-w-0">
              <option value="">All</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="gh-field-label">Active</span>
            <select name="isActive" defaultValue={statusFilter} className="gh-select min-w-0">
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2 lg:col-span-2">
            <span className="gh-field-label">Search</span>
            <input
              type="search"
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Name, slug, description"
              className="gh-input min-w-0"
              maxLength={120}
            />
          </label>
        </div>
        <input type="hidden" name="page" value="1" />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Apply filters
          </button>
          <Link href="/admin/pricing" className="gh-link text-sm text-[var(--color-text-muted)]">
            Clear filters
          </Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        {total === 0 ? "No plans match filters." : `Showing ${items.length} of ${total}.`}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Country</th>
              <th className="px-3 py-2 font-semibold">Service</th>
              <th className="px-3 py-2 font-semibold">Price</th>
              <th className="px-3 py-2 font-semibold">Currency</th>
              <th className="px-3 py-2 font-semibold">Interval</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className={`border-b border-[var(--color-border)] align-top ${p.isActive ? "" : "opacity-60"}`}>
                <td className="px-3 py-3 font-medium text-[var(--color-text-primary)]">{p.name}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{p.country.code}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">—</td>
                <td className="px-3 py-3 font-mono text-[var(--color-text-muted)]">{p.priceCents}</td>
                <td className="px-3 py-3 font-mono text-[var(--color-text-muted)]">{p.currencyCode}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{p.interval}</td>
                <td className="px-3 py-3">{p.isActive ? "Yes" : "No"}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <Link href={`/admin/pricing/${p.id}`} className="gh-link text-[var(--color-brand-primary)]">
                      View
                    </Link>
                    <Link href={`/admin/pricing/${p.id}/edit`} className="gh-link text-[var(--color-brand-primary)]">
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6 text-sm">
          <div className="text-[var(--color-text-muted)]">
            Page {page} of {totalPages} · {pageSize} per page
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildPricingHref(filters, { page: String(Math.max(1, page - 1)) })}
              className={`gh-btn ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              Previous
            </Link>
            <Link
              href={buildPricingHref(filters, { page: String(Math.min(totalPages, page + 1)) })}
              className={`gh-btn ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            >
              Next
            </Link>
          </div>
        </nav>
      ) : null}
    </section>
  );
}

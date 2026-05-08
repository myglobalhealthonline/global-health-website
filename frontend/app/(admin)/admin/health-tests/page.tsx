import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchAdminCountries, fetchAdminHealthTests, purgeAdminHealthTest } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

function spRead(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(filters: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...patch })) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/admin/health-tests?${qs}` : "/admin/health-tests";
}

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminHealthTestsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const filters = {
    page: spRead(sp, "page"),
    pageSize: spRead(sp, "pageSize"),
    countryId: spRead(sp, "countryId"),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const [listResult, countriesResult] = await Promise.all([
    fetchAdminHealthTests(filters),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return <section className="gh-card p-6 sm:p-8"><h1 className="gh-h2 text-[var(--color-text-primary)]">Health Tests</h1><p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">Could not load countries: {countriesResult.message}</p></section>;
  }
  if (!listResult.ok) {
    return <section className="gh-card p-6 sm:p-8"><h1 className="gh-h2 text-[var(--color-text-primary)]">Health Tests</h1><p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">Could not load health tests: {listResult.message}</p></section>;
  }

  const { items, pagination } = listResult.data;
  const { page, pageSize, total, totalPages } = pagination;
  const successMessage = spRead(sp, "success");
  const errorMessage = spRead(sp, "error");

  async function deleteAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    const result = await purgeAdminHealthTest(id);
    if (!result.ok) redirect(`/admin/health-tests?error=${encodeURIComponent(result.message)}`);
    revalidatePath("/admin/health-tests");
    redirect("/admin/health-tests?success=Health%20test%20deleted");
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Health Tests</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">Manage dedicated product-style health-test pages with price, sample type, result timing, structured coverage, and image-led public layouts.</p>
        </div>
        <Link href="/admin/health-tests/new" className="gh-btn gh-btn-primary">Add health test</Link>
      </div>

      {errorMessage ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{errorMessage}</p> : null}
      {successMessage ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{successMessage}</p> : null}

      <form method="get" className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select name="countryId" defaultValue={filters.countryId ?? ""} className="gh-select min-w-0">
              <option value="">All</option>
              {countriesResult.data.countries.map((country) => (
                <option key={country.id} value={country.id}>{country.name}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2">
            <span className="gh-field-label">Active</span>
            <select name="isActive" defaultValue={filters.isActive ?? ""} className="gh-select min-w-0">
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2 lg:col-span-2">
            <span className="gh-field-label">Search</span>
            <input type="search" name="search" defaultValue={filters.search ?? ""} className="gh-input min-w-0" placeholder="Title, slug, sample type" />
          </label>
        </div>
        <input type="hidden" name="page" value="1" />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">Apply filters</button>
          <Link href="/admin/health-tests" className="gh-link text-sm text-[var(--color-text-muted)]">Clear filters</Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">{total === 0 ? "No health tests match these filters." : `Showing ${items.length} of ${total}.`}</p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-semibold">Title</th>
              <th className="px-3 py-2 font-semibold">Slug</th>
              <th className="px-3 py-2 font-semibold">Country</th>
              <th className="px-3 py-2 font-semibold">Price</th>
              <th className="px-3 py-2 font-semibold">Sample / results</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={`border-b border-[var(--color-border)] align-top ${item.isActive ? "" : "opacity-60"}`}>
                <td className="px-3 py-3 font-medium text-[var(--color-text-primary)]">{item.title}</td>
                <td className="px-3 py-3 font-mono text-xs text-[var(--color-text-muted)]">{item.slug}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{item.country.code}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{formatMoney(item.priceCents, item.currencyCode)}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{[item.sampleType, item.resultsTimeline].filter(Boolean).join(" | ") || "—"}</td>
                <td className="px-3 py-3">{item.isActive ? "Yes" : "No"}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <Link href={`/admin/health-tests/${item.id}`} className="gh-link text-[var(--color-brand-primary)]">View</Link>
                    <Link href={`/admin/health-tests/${item.id}/edit`} className="gh-link text-[var(--color-brand-primary)]">Edit</Link>
                    <form action={deleteAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="gh-link text-left text-[var(--color-status-danger-text)]">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6 text-sm">
          <div className="text-[var(--color-text-muted)]">Page {page} of {totalPages} · {pageSize} per page</div>
          <div className="flex flex-wrap gap-2">
            <Link href={buildHref(filters, { page: String(Math.max(1, page - 1)) })} className={`gh-btn ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}>Previous</Link>
            <Link href={buildHref(filters, { page: String(Math.min(totalPages, page + 1)) })} className={`gh-btn ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}>Next</Link>
          </div>
        </nav>
      ) : null}
    </section>
  );
}

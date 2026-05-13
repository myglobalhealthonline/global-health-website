import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  fetchAdminContentPages,
  fetchAdminCountries,
  purgeAdminContentPage,
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
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Content pages</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load content pages: {pagesResult.ok ? countriesResult.message : pagesResult.message}
        </p>
      </section>
    );
  }
  const successMessage = spRead(sp, "success");
  const errorMessage = spRead(sp, "error");

  async function deleteContentPageAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    const result = await purgeAdminContentPage(id);
    if (!result.ok) {
      redirect(`/admin/content-pages?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/content-pages");
    redirect("/admin/content-pages?success=Content%20page%20deleted");
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Content pages</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
            Legal/static pages may require approved business/legal copy. Keep public legal routes fallback-safe until approved content is confirmed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/content-pages/new" className="gh-btn gh-btn-primary">
            New content page
          </Link>

        </div>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{successMessage}</p>
      ) : null}

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
                  <div className="flex flex-col gap-1">
                    <Link href={`/admin/content-pages/${page.id}`} className="gh-link">View</Link>
                    <Link href={`/admin/content-pages/${page.id}/edit`} className="gh-link">Edit</Link>
                    <form action={deleteContentPageAction}>
                      <input type="hidden" name="id" value={page.id} />
                      <button type="submit" className="gh-link text-left text-[var(--color-status-danger-text)]">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

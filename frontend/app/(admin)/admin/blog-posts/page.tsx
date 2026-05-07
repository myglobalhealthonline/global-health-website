import Link from "next/link";
import { fetchAdminBlogPosts, fetchAdminCountries } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

function spRead(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = sp[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminBlogPostsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const filters: Record<string, string | undefined> = {
    page: spRead(sp, "page"),
    locale: spRead(sp, "locale"),
    countryId: spRead(sp, "countryId"),
    status: spRead(sp, "status"),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const [postsResult, countriesResult] = await Promise.all([
    fetchAdminBlogPosts(filters),
    fetchAdminCountries(),
  ]);

  if (!postsResult.ok || !countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Blog posts</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load admin blog data: {postsResult.ok ? countriesResult.message : postsResult.message}
        </p>
      </section>
    );
  }

  const { items } = postsResult.data;
  const countries = countriesResult.data.countries;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Blog posts</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">Manage blog posts by country, locale, and status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/blog-posts/new" className="gh-btn gh-btn-primary">
            New post
          </Link>

        </div>
      </div>

      <form method="get" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input aria-label="Search blog posts" className="gh-input" name="search" defaultValue={filters.search ?? ""} placeholder="Search title/slug" />
        <select aria-label="Filter by country" className="gh-select" name="countryId" defaultValue={filters.countryId ?? ""}>
          <option value="">All countries</option>
          {countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
        <select aria-label="Filter by locale" className="gh-select" name="locale" defaultValue={filters.locale ?? ""}>
          <option value="">All locales</option>
          {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
            <option key={locale} value={locale}>
              {locale}
            </option>
          ))}
        </select>
        <select aria-label="Filter by status" className="gh-select" name="status" defaultValue={filters.status ?? ""}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
        <select aria-label="Filter by activity" className="gh-select" name="isActive" defaultValue={filters.isActive ?? ""}>
          <option value="">All activity</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button className="gh-btn gh-btn-primary" type="submit">
          Apply
        </button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Locale</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((post) => (
              <tr key={post.id} className="border-b border-[var(--color-border)]">
                <td className="px-3 py-2 text-[var(--color-text-primary)]">{post.title}</td>
                <td className="px-3 py-2 font-mono text-xs">{post.slug}</td>
                <td className="px-3 py-2">{post.locale}</td>
                <td className="px-3 py-2">{post.status}</td>
                <td className="px-3 py-2">{post.country?.code ?? "GLOBAL"}</td>
                <td className="px-3 py-2">{post.isActive ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  <Link className="gh-link mr-3" href={`/admin/blog-posts/${post.id}`}>
                    View
                  </Link>
                  <Link className="gh-link" href={`/admin/blog-posts/${post.id}/edit`}>
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

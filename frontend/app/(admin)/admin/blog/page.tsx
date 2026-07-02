import { Edit3, FileText, Languages, Plus } from "lucide-react";
import { fetchAdminBlogPosts, fetchAdminCountries, type AdminBlogDto } from "@/lib/admin/admin-api";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  AdminTable,
  Btn,
  IconBtn,
  PageHeader,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
} from "../_components/atoms";

export const dynamic = "force-dynamic";

function spRead(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

type SearchParams = Record<string, string | string[] | undefined>;

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminBlogListPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};
  const filters = {
    status: spRead(sp, "status"),
    search: spRead(sp, "search"),
    countryId: spRead(sp, "countryId"),
    authorDisplayName: spRead(sp, "authorDisplayName"),
    hasTranslation: spRead(sp, "hasTranslation"),
  };
  const [result, countriesResult] = await Promise.all([
    fetchAdminBlogPosts(filters),
    fetchAdminCountries(),
  ]);
  const countries = countriesResult.ok ? countriesResult.data.countries : [];
  const posts = result.ok ? result.data.items : [];
  const publishedCount = posts.filter((p) => p.status === "PUBLISHED" && p.isActive).length;
  const translatedCount = posts.filter((p) => p.translations.length > 0).length;

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Blog"
        description="Upload and publish blog articles. Published posts appear on the public /blog."
        actions={
          <Btn href="/admin/blog/new" variant="primary" size="md" iconLeft={<Plus className="size-4" />}>
            New post
          </Btn>
        }
      />

      <AdminCard padding={16}>
        <form action="/admin/blog" className="gh-admin-blog-filters px-2 py-1" method="get">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label text-[12px]">Search</span>
            <input
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Title, slug or category"
              className="gh-input min-w-[180px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label text-[12px]">Status</span>
            <select name="status" defaultValue={filters.status ?? ""} className="gh-select min-w-[140px]">
              <option value="">Any status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label text-[12px]">Country</span>
            <select name="countryId" defaultValue={filters.countryId ?? ""} className="gh-select min-w-[150px]">
              <option value="">Any country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label text-[12px]">Author</span>
            <input
              name="authorDisplayName"
              defaultValue={filters.authorDisplayName ?? ""}
              placeholder="Author name"
              className="gh-input min-w-[140px]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label text-[12px]">Translations</span>
            <select
              name="hasTranslation"
              defaultValue={filters.hasTranslation ?? ""}
              className="gh-select min-w-[150px]"
            >
              <option value="">Any</option>
              <option value="true">Has translations</option>
              <option value="false">No translations</option>
            </select>
          </label>
          <div className="gh-admin-blog-actions pb-0.5">
            <Btn type="submit" variant="secondary" size="sm">
              Apply
            </Btn>
            <Btn href="/admin/blog" variant="ghost" size="sm">
              Clear
            </Btn>
          </div>
        </form>
      </AdminCard>

      <div className="gh-admin-blog-list mt-6">
        {!result.ok ? (
          <AdminCard>
            <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
              Could not load blog posts: {result.message}
            </p>
          </AdminCard>
        ) : result.data.items.length === 0 ? (
          <AdminCard>
            <AdminEmptyState
              assetSrc="/images/portal/generated/admin-content-management-accent.png"
              title="No blog posts match these filters"
              description="Create the first article or clear the current filters to review draft and published content."
              action={
                <Btn href="/admin/blog/new" variant="primary" size="sm" iconLeft={<Plus className="size-3.5" />}>
                  New post
                </Btn>
              }
            />
          </AdminCard>
        ) : (
          <AdminCard padding={0}>
            <div className="border-b border-[var(--color-border)] px-4 pt-4">
              <AdminSummaryStrip
                items={[
                  {
                    label: "Posts shown",
                    value: posts.length,
                    hint: "Matching filters",
                    tone: "brand",
                  },
                  {
                    label: "Published",
                    value: publishedCount,
                    hint: "Live articles",
                    tone: publishedCount > 0 ? "success" : "neutral",
                  },
                  {
                    label: "Translated",
                    value: translatedCount,
                    hint: "Has localized rows",
                    tone: translatedCount > 0 ? "neutral" : "warning",
                  },
                ]}
              />
            </div>
            <div className="gh-admin-blog-table-wrap gh-admin-deep-table-wrap">
            <AdminTable>
              <Thead>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Lang</Th>
                <Th>Translations</Th>
                <Th>Status</Th>
                <Th>Published</Th>
                <Th align="right">Actions</Th>
              </Thead>
              <tbody>
                {result.data.items.map((p: AdminBlogDto) => (
                  <Tr key={p.id}>
                    <Td style={{ minWidth: 240 }}>
                      <span className="line-clamp-1 max-w-[280px] font-semibold">{p.title}</span>
                      <span className="block font-mono text-[11px] text-[var(--color-text-muted)]">{p.slug}</span>
                    </Td>
                    <Td>{p.category ?? "—"}</Td>
                    <Td>{p.locale}</Td>
                    <Td>
                      {p.translations.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)]">
                          <Languages className="size-3" aria-hidden />
                          {p.translations.length}
                        </span>
                      ) : (
                        <span className="text-[12px] text-[var(--color-text-muted)]">—</span>
                      )}
                    </Td>
                    <Td>
                      <Pill tone={p.status === "PUBLISHED" ? "published" : "draft"}>
                        {p.isActive ? p.status : "INACTIVE"}
                      </Pill>
                    </Td>
                    <Td>{p.publishedAt ? DATE_FMT.format(new Date(p.publishedAt)) : "—"}</Td>
                    <Td align="right">
                      <IconBtn href={`/admin/blog/${p.id}/edit`} ariaLabel="Edit post">
                        <Edit3 className="size-4" />
                      </IconBtn>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </AdminTable>
            </div>
            <div className="gh-admin-mobile-list">
              {posts.map((p: AdminBlogDto) => (
                <article key={p.id} className="gh-admin-mobile-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="gh-admin-mobile-card-title">{p.title}</h3>
                      <p className="gh-admin-mobile-card-meta font-mono">{p.slug}</p>
                    </div>
                    <Pill tone={p.status === "PUBLISHED" ? "published" : "draft"}>
                      {p.isActive ? p.status : "INACTIVE"}
                    </Pill>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[12px] text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="size-3" aria-hidden />
                      {p.category ?? "No category"}
                    </span>
                    <span>{p.locale}</span>
                    <span>{p.translations.length} translations</span>
                  </div>
                  <div className="gh-admin-mobile-actions">
                    <IconBtn href={`/admin/blog/${p.id}/edit`} ariaLabel="Edit post">
                      <Edit3 className="size-4" />
                    </IconBtn>
                  </div>
                </article>
              ))}
            </div>
          </AdminCard>
        )}
      </div>
    </>
  );
}

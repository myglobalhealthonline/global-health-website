import { Edit3, FileText, Plus } from "lucide-react";
import { fetchAdminBlogPosts, fetchAdminCountries, type AdminBlogDto } from "@/lib/admin/admin-api";
import { AdminCard, AdminEmptyState, AdminSummaryStrip, Btn, IconBtn, PageHeader, Pill } from "../_components/atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { ResponsiveFilterBar } from "@/components/ResponsiveFilterBar";

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

function BlogPostsTable({ posts }: { posts: AdminBlogDto[] }) {
  const fields: ColumnPriorityField<AdminBlogDto>[] = [
    {
      key: "title",
      label: "Title",
      priority: 1,
      render: (p) => (
        <>
          <span className="line-clamp-1 max-w-[280px] font-semibold">{p.title}</span>
          <span className="block font-mono text-portal-thead text-[var(--color-text-muted)]">{p.slug}</span>
        </>
      ),
    },
    {
      key: "category",
      label: "Category",
      priority: 2,
      render: (p) => (
        <span className="inline-flex items-center gap-1">
          <FileText className="size-3" aria-hidden />
          {p.category ?? "No category"}
        </span>
      ),
    },
    {
      key: "countries",
      label: "Countries",
      cardLabel: "Countries",
      priority: 3,
      render: (p) =>
        p.countries.length > 0 ? (
          <span className="gh-admin-blog-chips">
            {[...p.countries]
              .sort((a, b) => a.country.name.localeCompare(b.country.name))
              .map((c) => (
                <span key={c.id} className="gh-admin-blog-chip">
                  {c.country.name}
                </span>
              ))}
          </span>
        ) : (
          <span className="text-portal-meta text-[var(--color-text-muted)]">Global</span>
        ),
    },
    {
      // One cell for every language this post exists in — the post's own
      // locale plus each translation — instead of a bare "Lang" column that
      // made the language look like the post's category.
      key: "locales",
      label: "Languages",
      cardLabel: "Languages",
      priority: 2,
      render: (p) => (
        <span className="gh-admin-blog-chips">
          <span className="gh-admin-blog-chip gh-admin-blog-chip--original" title="Original language">
            {p.locale}
          </span>
          {[...p.translations]
            .sort((a, b) => a.locale.localeCompare(b.locale))
            .map((t) => (
              <span key={t.id} className="gh-admin-blog-chip">
                {t.locale.toUpperCase()}
              </span>
            ))}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (p) => (
        <Pill tone={p.status === "PUBLISHED" ? "published" : "draft"}>
          {p.isActive ? p.status : "INACTIVE"}
        </Pill>
      ),
    },
    {
      key: "published",
      label: "Published",
      priority: 3,
      render: (p) => (p.publishedAt ? DATE_FMT.format(new Date(p.publishedAt)) : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      align: "right",
      desktopOnly: true,
      render: (p) => (
        <IconBtn href={`/admin/blog/${p.id}/edit`} ariaLabel="Edit post">
          <Edit3 className="size-4" />
        </IconBtn>
      ),
    },
  ];

  return (
    <ColumnPriorityTable
      fields={fields}
      rows={posts}
      getRowKey={(p) => p.id}
      cardTone={(p) => (p.isActive && p.status === "PUBLISHED" ? "success" : "neutral")}
      cardActions={(p) => (
        <IconBtn href={`/admin/blog/${p.id}/edit`} ariaLabel="Edit post">
          <Edit3 className="size-4" />
        </IconBtn>
      )}
    />
  );
}

/** Group posts by country for display. A post assigned to several countries
 *  is listed under each of them, because an editor looking at "Ireland" wants
 *  every article Ireland shows — not only the ones Ireland owns exclusively.
 *  Posts with no assignment are global and get their own group at the end. */
function groupByCountry(posts: AdminBlogDto[]): Array<{ key: string; name: string; posts: AdminBlogDto[] }> {
  const groups = new Map<string, { name: string; posts: AdminBlogDto[] }>();
  const global: AdminBlogDto[] = [];
  for (const post of posts) {
    if (post.countries.length === 0) {
      global.push(post);
      continue;
    }
    for (const link of post.countries) {
      const entry = groups.get(link.country.id) ?? { name: link.country.name, posts: [] };
      entry.posts.push(post);
      groups.set(link.country.id, entry);
    }
  }
  const out = [...groups.entries()]
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([id, v]) => ({ key: id, name: v.name, posts: v.posts }));
  if (global.length > 0) out.push({ key: "global", name: "Global — all countries", posts: global });
  return out;
}

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
  const groups = groupByCountry(posts);
  /* An article visible in several countries is listed under each of them,
   * because that is what "articles in Ireland" means to whoever is looking.
   * The consequence is that the group counts can sum higher than the number
   * of articles, so the summary says which number it is rather than leaving
   * the two silently disagreeing. */
  const listings = groups.reduce((n, g) => n + g.posts.length, 0);

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
        <form action="/admin/blog" className="flex flex-col gap-3 px-2 py-1" method="get">
          <ResponsiveFilterBar
            search={
              <label className="flex flex-col gap-1">
                <span className="gh-field-label text-portal-meta">Search</span>
                <input
                  name="search"
                  defaultValue={filters.search ?? ""}
                  placeholder="Title, slug or category"
                  className="gh-input min-w-0"
                />
              </label>
            }
          >
            <label className="flex min-w-0 flex-col gap-1">
              <span className="gh-field-label text-portal-meta">Status</span>
              <select name="status" defaultValue={filters.status ?? ""} className="gh-select min-w-0">
                <option value="">Any status</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="gh-field-label text-portal-meta">Country</span>
              <select name="countryId" defaultValue={filters.countryId ?? ""} className="gh-select min-w-0">
                <option value="">Any country</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="gh-field-label text-portal-meta">Author</span>
              <input
                name="authorDisplayName"
                defaultValue={filters.authorDisplayName ?? ""}
                placeholder="Author name"
                className="gh-input min-w-0"
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className="gh-field-label text-portal-meta">Translations</span>
              <select
                name="hasTranslation"
                defaultValue={filters.hasTranslation ?? ""}
                className="gh-select min-w-0"
              >
                <option value="">Any</option>
                <option value="true">Has translations</option>
                <option value="false">No translations</option>
              </select>
            </label>
          </ResponsiveFilterBar>
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
              assetSrc="/images/portal/obsidian/empty-content.svg"
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
          <>
            <AdminCard padding={0}>
              <div className="px-4 py-4">
                <AdminSummaryStrip
                  items={[
                    {
                      label: "Articles",
                      value: posts.length,
                      hint:
                        listings > posts.length
                          ? `${listings} listings — some serve several countries`
                          : "Matching filters",
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
                      hint: "Has other languages",
                      tone: translatedCount > 0 ? "neutral" : "warning",
                    },
                  ]}
                />
              </div>
            </AdminCard>

            {/* One section per country. Articles are the unit of work here,
                and an article belongs to a market — grouping by language put
                the same article in six places and hid which market owns it. */}
            {groups.map((group) => (
              <AdminCard key={group.key} padding={0} className="mt-4">
                <div className="gh-admin-blog-group-head">
                  <h2 className="gh-admin-blog-group-title">{group.name}</h2>
                  <Pill tone="brand">
                    {group.posts.length} {group.posts.length === 1 ? "article" : "articles"}
                  </Pill>
                </div>
                <BlogPostsTable posts={group.posts} />
              </AdminCard>
            ))}
          </>
        )}
      </div>
    </>
  );
}

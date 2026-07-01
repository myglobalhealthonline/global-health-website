import { Edit3, FileText, Plus } from "lucide-react";
import {
  ADMIN_PAGE_KEY_LABELS,
  ADMIN_PAGE_KEYS,
  fetchAdminCountries,
  fetchAdminPages,
  type AdminPageDto,
  type AdminPageKey,
} from "@/lib/admin/admin-api";
import { getActiveCountry, scopedCountryId } from "@/lib/admin/admin-scope";
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
import { FlagBadge } from "../_components/flag-badge";
import { ScopeBanner } from "../_components/scope-banner";

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

export default async function AdminPagesListPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = searchParams ? await searchParams : {};

  // Resolve cookie-scoped country first so the page list defaults to that
  // country when no explicit ?countryId is in the URL.
  const countriesResult = await fetchAdminCountries();
  const countries =
    countriesResult.ok && countriesResult.data?.countries
      ? countriesResult.data.countries
      : [];
  const activeCountry = await getActiveCountry(countries);

  const filters = {
    countryId: scopedCountryId(spRead(sp, "countryId"), activeCountry),
    pageKey: spRead(sp, "pageKey"),
    locale: spRead(sp, "locale"),
    status: spRead(sp, "status"),
  };

  const pagesResult = await fetchAdminPages(filters);
  const pages = pagesResult.ok ? pagesResult.data.items : [];
  const publishedPages = pages.filter((p) => p.status === "PUBLISHED").length;
  const countryScopedPages = pages.filter((p) => p.country).length;

  return (
    <>
      <PageHeader
        className="gh-admin-area-hero gh-admin-area-cms"
        eyebrow={activeCountry ? `Country · ${activeCountry.name}` : "Global"}
        title="Pages"
        description="Manage country-scoped homepage, doctors index, general consultation, and specialist consultation content."
        actions={
          <Btn
            href="/admin/pages/new"
            variant="primary"
            size="md"
            iconLeft={<Plus className="size-4" />}
          >
            New page
          </Btn>
        }
      />

      <ScopeBanner activeCountry={activeCountry} clearHref="/admin/pages" />

      <AdminCard padding={16} className="gh-admin-area-hero gh-admin-area-cms gh-admin-pages-filters">
        <form
          action="/admin/pages"
          className="gh-admin-area-hero gh-admin-area-cms gh-admin-support-filter-row flex flex-wrap items-end gap-3 px-2 py-1"
          method="get"
        >
          <label className="flex flex-col text-[12px] font-semibold text-[var(--color-text-muted)]">
            Country
            <select
              name="countryId"
              defaultValue={filters.countryId ?? ""}
              className="mt-1 min-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]"
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[12px] font-semibold text-[var(--color-text-muted)]">
            Page type
            <select
              name="pageKey"
              defaultValue={filters.pageKey ?? ""}
              className="mt-1 min-w-[180px] rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]"
            >
              <option value="">All page types</option>
              {ADMIN_PAGE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {ADMIN_PAGE_KEY_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[12px] font-semibold text-[var(--color-text-muted)]">
            Locale
            <select
              name="locale"
              defaultValue={filters.locale ?? ""}
              className="mt-1 min-w-[120px] rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]"
            >
              <option value="">All locales</option>
              {["EN", "PT", "ES", "CS", "RO", "DE"].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[12px] font-semibold text-[var(--color-text-muted)]">
            Status
            <select
              name="status"
              defaultValue={filters.status ?? ""}
              className="mt-1 min-w-[120px] rounded-md border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]"
            >
              <option value="">Any status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </label>
          <Btn type="submit" variant="secondary" size="sm">
            Apply
          </Btn>
          <Btn href="/admin/pages" variant="ghost" size="sm">
            Clear
          </Btn>
        </form>
      </AdminCard>

      <div className="mt-6">
        {!pagesResult.ok ? (
          <AdminCard>
            <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
              Could not load pages: {pagesResult.message}
            </p>
          </AdminCard>
        ) : pagesResult.data.items.length === 0 ? (
          <AdminCard>
            <AdminEmptyState
              assetSrc="/images/portal/generated/admin-content-management-accent.png"
              title="No pages match these filters"
              description="Clear the country, page type, locale, or status filter, or create a new country-scoped content page."
              action={
                <Btn href="/admin/pages/new" variant="primary" size="sm" iconLeft={<Plus className="size-3.5" />}>
                  New page
                </Btn>
              }
            />
          </AdminCard>
        ) : (
          <AdminCard padding={0} className="gh-admin-area-hero gh-admin-area-cms gh-admin-pages-list">
            <div className="border-b border-[var(--color-border)] px-4 pt-4">
              <AdminSummaryStrip
                items={[
                  {
                    label: "Pages shown",
                    value: pages.length,
                    hint: "Matching filters",
                    tone: "brand",
                  },
                  {
                    label: "Published",
                    value: publishedPages,
                    hint: "Ready for public site",
                    tone: publishedPages > 0 ? "success" : "neutral",
                  },
                  {
                    label: "Country scoped",
                    value: countryScopedPages,
                    hint: activeCountry ? activeCountry.name : "All countries",
                    tone: countryScopedPages > 0 ? "neutral" : "warning",
                  },
                ]}
              />
            </div>
            <div className="gh-admin-area-hero gh-admin-area-cms gh-admin-support-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
            <AdminTable>
              <Thead>
                <Th>Country</Th>
                <Th>Page type</Th>
                <Th>Locale</Th>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </Thead>
              <tbody>
                {pagesResult.data.items.map((p: AdminPageDto) => (
                  <Tr key={p.id}>
                    <Td>
                      {p.country ? (
                        <span className="inline-flex items-center gap-2">
                          <FlagBadge code={p.country.slug} />
                          <span>{p.country.name}</span>
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">—</span>
                      )}
                    </Td>
                    <Td>{ADMIN_PAGE_KEY_LABELS[p.pageKey as AdminPageKey]}</Td>
                    <Td>{p.locale}</Td>
                    <Td>
                      <span className="line-clamp-1 max-w-[320px]">{p.title}</span>
                    </Td>
                    <Td>
                      <Pill tone={p.status === "PUBLISHED" ? "published" : "draft"}>
                        {p.status}
                      </Pill>
                    </Td>
                    <Td align="right">
                      <IconBtn href={`/admin/pages/${p.id}/edit`} ariaLabel="Edit page">
                        <Edit3 className="size-4" />
                      </IconBtn>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </AdminTable>
            </div>
            <div className="gh-admin-mobile-list">
              {pages.map((p: AdminPageDto) => (
                <article key={p.id} className="gh-admin-mobile-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="gh-admin-mobile-card-title">{p.title}</h3>
                      <p className="gh-admin-mobile-card-meta">
                        {ADMIN_PAGE_KEY_LABELS[p.pageKey as AdminPageKey]} - {p.locale}
                      </p>
                    </div>
                    <Pill tone={p.status === "PUBLISHED" ? "published" : "draft"}>
                      {p.status}
                    </Pill>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-text-muted)]">
                    <FileText className="size-3" aria-hidden />
                    {p.country ? (
                      <span className="inline-flex items-center gap-2">
                        <FlagBadge code={p.country.slug} />
                        {p.country.name}
                      </span>
                    ) : (
                      <span>Global page</span>
                    )}
                  </div>
                  <div className="gh-admin-mobile-actions">
                    <IconBtn href={`/admin/pages/${p.id}/edit`} ariaLabel="Edit page">
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

import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import {
  fetchAdminCountries,
  fetchAdminHealthTests,
  patchAdminHealthTestsReorder,
  purgeAdminHealthTest,
} from "@/lib/admin/admin-api";
import { getActiveCountry, scopedCountryId } from "@/lib/admin/admin-scope";
import { ScopeBanner } from "../_components/scope-banner";
import { AdminHealthTestsTable } from "./_components/admin-health-tests-table";
import { AdminCard, AdminSummaryStrip, Btn, PageHeader } from "../_components/atoms";

export const dynamic = "force-dynamic";

function spRead(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(
  filters: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...patch })) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/admin/health-tests?${qs}` : "/admin/health-tests";
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminHealthTestsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};

  // Country scope (cookie) is the default countryId filter when the URL
  // doesn't already specify one. Explicit URL filters always win.
  const countriesResult = await fetchAdminCountries();
  const countriesForScope = countriesResult.ok ? countriesResult.data.countries : [];
  const activeCountry = await getActiveCountry(countriesForScope);

  const filters = {
    page: spRead(sp, "page"),
    pageSize: spRead(sp, "pageSize"),
    countryId: scopedCountryId(spRead(sp, "countryId"), activeCountry),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const listResult = await fetchAdminHealthTests(filters);

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Services" title="Health tests" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }
  if (!listResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Services" title="Health tests" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load health tests: {listResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const { items, pagination } = listResult.data;
  const { page, pageSize, total, totalPages } = pagination;
  const activeTests = items.filter((item) => item.isActive).length;
  const pricedTests = items.filter((item) => item.priceCents > 0).length;
  const timedTests = items.filter((item) => item.resultsTimeline).length;
  const successMessage = spRead(sp, "success");
  const errorMessage = spRead(sp, "error");

  async function deleteAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "").trim();
    const result = await purgeAdminHealthTest(id);
    if (!result.ok)
      redirect(`/admin/health-tests?error=${encodeURIComponent(result.message)}`);
    revalidatePath("/admin/health-tests");
    redirect("/admin/health-tests?success=Health%20test%20deleted");
  }

  // Minimal per-row snapshot for the move-up/down closure.
  const rowOrder = items.map((item) => ({ id: item.id, countryId: item.countryId }));

  async function moveRowAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "").trim();
    const direction = String(formData.get("direction") ?? "");
    const qs = String(formData.get("_qs") ?? "");
    const returnPath = qs ? `/admin/health-tests?${qs}` : "/admin/health-tests";

    const index = rowOrder.findIndex((r) => r.id === id);
    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    const row = rowOrder[index];
    const neighbor = rowOrder[neighborIndex];
    if (!row || !neighbor || neighbor.countryId !== row.countryId) {
      redirect(returnPath);
    }

    const subsequence = rowOrder.filter((r) => r.countryId === row.countryId);
    const rowPos = subsequence.findIndex((r) => r.id === row.id);
    const neighborPos = subsequence.findIndex((r) => r.id === neighbor.id);
    [subsequence[rowPos], subsequence[neighborPos]] = [subsequence[neighborPos], subsequence[rowPos]];
    const reorderItems = subsequence.map((r, i) => ({ id: r.id, sortOrder: (i + 1) * 10 }));

    const result = await patchAdminHealthTestsReorder(reorderItems);
    if (!result.ok) {
      redirect(`${returnPath}${returnPath.includes("?") ? "&" : "?"}error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/health-tests");
    redirect(returnPath);
  }

  const currentQs = buildHref(filters, {}).split("?")[1] ?? "";

  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Health tests"
        description="Product-style pages with price, sample type, result timing, structured coverage, and image-led public layouts."
        actions={
          <Btn
            href="/admin/health-tests/new"
            variant="primary"
            size="md"
            iconLeft={<Plus className="size-3.5" aria-hidden />}
          >
            Add health test
          </Btn>
        }
      />

      <ScopeBanner activeCountry={activeCountry} clearHref="/admin/health-tests" />

      {errorMessage ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {successMessage}
        </p>
      ) : null}

      <AdminSummaryStrip
        items={[
          { label: "Tests", value: total, hint: `${items.length} shown`, tone: "brand" },
          { label: "Active", value: activeTests, hint: "Bookable test pages", tone: "success" },
          { label: "Configured", value: pricedTests, hint: `${timedTests} with result timing`, tone: "neutral" },
        ]}
      />

      {/* Filters */}
      <AdminCard padding={0} className="mb-4 overflow-hidden">
        <form method="get" className="gh-admin-health-filters px-5 py-4">
          <div className="gh-admin-health-filter-grid">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select
                name="countryId"
                defaultValue={filters.countryId ?? ""}
                className="gh-select min-w-0"
              >
                <option value="">All</option>
                {countriesResult.data.countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Status</span>
              <select
                name="isActive"
                defaultValue={filters.isActive ?? ""}
                className="gh-select min-w-0"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 lg:col-span-2">
              <span className="gh-field-label">Search</span>
              <input
                type="search"
                name="search"
                defaultValue={filters.search ?? ""}
                className="gh-input min-w-0"
                placeholder="Title, slug, sample type"
              />
            </label>
          </div>
          <input type="hidden" name="page" value="1" />
          <div className="gh-admin-health-actions mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className="gh-btn gh-btn-primary" style={{ minHeight: 36 }}>
              Apply filters
            </button>
            <Link
              href="/admin/health-tests"
              className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Clear filters
            </Link>
            <span className="ml-auto text-[12px] text-[var(--color-text-muted)]">
              {total === 0
                ? "No health tests match these filters."
                : `Showing ${items.length} of ${total}.`}
            </span>
          </div>
        </form>
      </AdminCard>

      {/* Table */}
      <AdminCard padding={0} className="overflow-hidden">
        <AdminHealthTestsTable
          items={items}
          currentQs={currentQs}
          moveRowAction={moveRowAction}
          deleteAction={deleteAction}
        />

        {totalPages > 1 ? (
          <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-background-soft)] px-5 py-3 text-[13px]">
            <div className="text-[var(--color-text-muted)]">
              Page {page} of {totalPages} · {pageSize} per page
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildHref(filters, { page: String(Math.max(1, page - 1)) })}
                className={`gh-btn gh-btn-soft text-[13px] ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
                style={{ minHeight: 36, padding: "0 14px" }}
              >
                Previous
              </Link>
              <Link
                href={buildHref(filters, {
                  page: String(Math.min(totalPages, page + 1)),
                })}
                className={`gh-btn gh-btn-primary text-[13px] ${
                  page >= totalPages ? "pointer-events-none opacity-40" : ""
                }`}
                style={{ minHeight: 36, padding: "0 14px" }}
              >
                Next
              </Link>
            </div>
          </nav>
        ) : null}
      </AdminCard>
    </>
  );
}

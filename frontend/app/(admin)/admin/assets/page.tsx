import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Edit3, Eye, Plus, Trash2 } from "lucide-react";
import {
  adminAssetPreviewable,
  fetchAdminAssets,
  fetchAdminCountries,
  purgeAdminAsset,
  type AdminAssetDto,
  type AdminAssetKind,
} from "@/lib/admin/admin-api";
import { FlagBadge } from "../_components/flag-badge";
import { ConfirmDeleteButton } from "../_components/confirm-delete-button";
import {
  AdminCard,
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

function buildAssetsHref(
  filters: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...filters, ...patch })) {
    if (v !== undefined && v !== "") {
      merged[k] = v;
    }
  }
  const params = new URLSearchParams(merged);
  const qs = params.toString();
  return qs ? `/admin/assets?${qs}` : "/admin/assets";
}

function spRead(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function PreviewCell({ item }: { item: AdminAssetDto }) {
  const path = item.path;
  const ok = adminAssetPreviewable(item.kind as AdminAssetKind, path);
  if (!ok) {
    return <span className="text-[var(--color-text-muted)]">—</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={path}
      alt={item.altText ?? ""}
      className="max-h-10 max-w-[100px] rounded border border-[var(--color-border)] object-contain"
      loading="lazy"
    />
  );
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAssetsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const filters: Record<string, string | undefined> = {
    page: spRead(sp, "page"),
    pageSize: spRead(sp, "pageSize"),
    countryId: spRead(sp, "countryId"),
    kind: spRead(sp, "kind"),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const [listResult, countriesResult] = await Promise.all([
    fetchAdminAssets(filters),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Global" title="Assets" />
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
        <PageHeader eyebrow="Global" title="Assets" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load assets: {listResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const { items, pagination } = listResult.data;
  const { page, pageSize, total, totalPages } = pagination;
  const countries = countriesResult.data.countries;
  const statusFilter = filters.isActive ?? "";
  const successMessage = spRead(sp, "success");
  const errorMessage = spRead(sp, "error");

  async function deleteAssetAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    const result = await purgeAdminAsset(id);
    if (!result.ok) {
      redirect(`/admin/assets?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/assets");
    redirect("/admin/assets?success=Asset%20deleted");
  }

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Assets"
        description="Paths and URLs for hero, logo, badge, social, and icon imagery. Configure S3/Railway env vars for uploads."
        actions={
          <Btn
            href="/admin/assets/new"
            variant="primary"
            size="md"
            iconLeft={<Plus className="size-3.5" aria-hidden />}
          >
            Add asset
          </Btn>
        }
      />

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

      {/* Filters */}
      <AdminCard padding={0} className="mb-4 overflow-hidden">
        <form method="get" className="px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select
                name="countryId"
                defaultValue={filters.countryId ?? ""}
                className="gh-select min-w-0"
              >
                <option value="">All</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Kind</span>
              <select
                name="kind"
                defaultValue={filters.kind ?? ""}
                className="gh-select min-w-0"
              >
                <option value="">All</option>
                <option value="IMAGE">Image</option>
                <option value="ICON">Icon</option>
                <option value="LOGO">Logo</option>
                <option value="BADGE">Badge</option>
                <option value="SOCIAL">Social</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Status</span>
              <select
                name="isActive"
                defaultValue={statusFilter}
                className="gh-select min-w-0"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Search</span>
              <input
                type="search"
                name="search"
                defaultValue={filters.search ?? ""}
                placeholder="Key, path, alt, usage"
                className="gh-input min-w-0"
                maxLength={120}
              />
            </label>
          </div>
          <input type="hidden" name="page" value="1" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className="gh-btn gh-btn-primary" style={{ minHeight: 36 }}>
              Apply filters
            </button>
            <Link
              href="/admin/assets"
              className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Clear filters
            </Link>
            <span className="ml-auto text-[12px] text-[var(--color-text-muted)]">
              {total === 0
                ? "No assets match filters."
                : `Showing ${items.length} of ${total}.`}
            </span>
          </div>
        </form>
      </AdminCard>

      {/* Table */}
      <AdminCard padding={0} className="overflow-hidden">
        <div className="overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th style={{ width: 120 }}>Preview</Th>
              <Th>Key</Th>
              <Th>Kind</Th>
              <Th>Country</Th>
              <Th>Alt</Th>
              <Th>Usage</Th>
              <Th>Status</Th>
              <Th align="right" style={{ width: 120 }}>
                Actions
              </Th>
            </Thead>
            <tbody>
              {items.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <PreviewCell item={a} />
                  </Td>
                  <Td>
                    <span className="font-mono text-[11px] text-[var(--color-text-primary)]">
                      {a.key}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      {a.kind}
                    </span>
                  </Td>
                  <Td>
                    {a.country ? (
                      <span className="inline-flex items-center gap-2">
                        <FlagBadge code={a.country.code} size={14} />
                        <span className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                          {a.country.code}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[var(--color-text-placeholder)]">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="block max-w-[12rem] truncate text-[13px] text-[var(--color-text-muted)]">
                      {a.altText ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="block max-w-[14rem] truncate text-[13px] text-[var(--color-text-muted)]">
                      {a.usageNote ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <Pill tone={a.isActive ? "published" : "draft"}>
                      {a.isActive ? "Active" : "Inactive"}
                    </Pill>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1.5">
                      <IconBtn
                        ariaLabel={`View ${a.key}`}
                        href={`/admin/assets/${a.id}`}
                      >
                        <Eye className="size-3.5" aria-hidden />
                      </IconBtn>
                      <IconBtn
                        ariaLabel={`Edit ${a.key}`}
                        href={`/admin/assets/${a.id}/edit`}
                      >
                        <Edit3 className="size-3.5" aria-hidden />
                      </IconBtn>
                      <form action={deleteAssetAction} className="inline-flex">
                        <input type="hidden" name="id" value={a.id} />
                        <ConfirmDeleteButton
                          message={`Permanently delete asset "${a.key}"? This cannot be undone.`}
                          ariaLabel={`Delete ${a.key}`}
                        />
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </AdminTable>
        </div>

        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No assets match these filters.
          </p>
        ) : null}

        {totalPages > 1 ? (
          <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-background-soft)] px-5 py-3 text-[13px]">
            <div className="text-[var(--color-text-muted)]">
              Page {page} of {totalPages} · {pageSize} per page
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildAssetsHref(filters, {
                  page: String(Math.max(1, page - 1)),
                })}
                className={`gh-btn gh-btn-soft text-[13px] ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
                style={{ minHeight: 36, padding: "0 14px" }}
              >
                Previous
              </Link>
              <Link
                href={buildAssetsHref(filters, {
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

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Edit3, Eye, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  fetchAdminCountries,
  fetchAdminServices,
  fetchAdminSpecialties,
  purgeAdminService,
} from "@/lib/admin/admin-api";
import { getActiveCountry, scopedCountryId } from "@/lib/admin/admin-scope";
import {
  adminHrefForService,
  readServiceKind,
  SERVICE_KIND_META,
  SERVICE_KIND_ORDER,
} from "@/lib/admin/service-kind";
import { FlagBadge } from "../_components/flag-badge";
import { ConfirmDeleteButton } from "../_components/confirm-delete-button";
import { ScopeBanner } from "../_components/scope-banner";
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

function buildServicesHref(
  basePath: string,
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
  return qs ? `${basePath}?${qs}` : basePath;
}

function spRead(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function formatMoney(cents: number | null, currency: string | null) {
  if (cents === null || cents === undefined) return "—";
  const code = currency?.trim().toUpperCase() || "EUR";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${code} ${(cents / 100).toFixed(2)}`;
  }
}

export type AdminServicesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  forcedKind?: ReturnType<typeof readServiceKind>;
  showKindTabs?: boolean;
};

export default async function AdminServicesPage({
  searchParams,
  forcedKind,
  showKindTabs = true,
}: AdminServicesPageProps) {
  const sp = searchParams ? await searchParams : {};
  const kind = forcedKind ?? readServiceKind(spRead(sp, "kind"), "GENERAL");
  const meta = SERVICE_KIND_META[kind];
  const basePath = forcedKind ? meta.listHref : "/admin/services";
  // Fetch countries first so we can resolve the active-country cookie scope
  // before issuing the services query. The active country becomes the default
  // `countryId` filter when the URL doesn't already set one (explicit URL
  // filters always win — admins can still browse "All countries" by removing
  // the filter in the UI).
  const countriesResult = await fetchAdminCountries();
  const countriesForScope = countriesResult.ok ? countriesResult.data.countries : [];
  const activeCountry = await getActiveCountry(countriesForScope);

  const filters: Record<string, string | undefined> = {
    page: spRead(sp, "page"),
    pageSize: spRead(sp, "pageSize"),
    kind,
    countryId: scopedCountryId(spRead(sp, "countryId"), activeCountry),
    specialtyId: spRead(sp, "specialtyId"),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const listResult = await fetchAdminServices(filters);

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Services" title={meta.pageTitle} />
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
        <PageHeader eyebrow="Services" title={meta.pageTitle} />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load records: {listResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const { items, pagination } = listResult.data;
  const { page, pageSize, total, totalPages } = pagination;
  const countries = countriesResult.data.countries;

  let specialtyOptions: { id: string; name: string; slug: string }[] = [];
  const filterCountryId = filters.countryId;
  if (kind === "SPECIALIST" && filterCountryId) {
    const spRes = await fetchAdminSpecialties(filterCountryId);
    if (spRes.ok) {
      specialtyOptions = spRes.data.specialties;
    }
  }

  const statusFilter = filters.isActive ?? "";
  const successMessage = spRead(sp, "success");
  const errorMessage = spRead(sp, "error");
  const showsCategory = kind === "SPECIALIST";
  const filterCountry = filterCountryId
    ? countries.find((c) => c.id === filterCountryId) ?? null
    : null;

  async function deleteServiceAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    const result = await purgeAdminService(id);
    if (!result.ok) {
      redirect(`${basePath}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/services");
    revalidatePath(basePath);
    redirect(`${basePath}?success=Record%20deleted`);
  }

  return (
    <>
      <PageHeader
        eyebrow={
          filterCountry ? (
            <span className="inline-flex items-center gap-2">
              <FlagBadge code={filterCountry.code} size={14} />
              {filterCountry.name}
            </span>
          ) : (
            "Services"
          )
        }
        title={meta.pageTitle}
        description={
          filterCountry
            ? `Manage all ${meta.label.toLowerCase()} in ${filterCountry.name}. One form, conditional category dropdown for general/specialist.`
            : "Manage title, price, duration, sort order, and detail content per service."
        }
        actions={
          <Btn
            href={meta.newHref}
            variant="primary"
            size="md"
            iconLeft={<Plus className="size-3.5" aria-hidden />}
          >
            {meta.addLabel}
          </Btn>
        }
      />

      <ScopeBanner activeCountry={activeCountry} clearHref={basePath} />

      {/* Service-type segmented control — always shown so users can flip
          between general / specialist / prescriptions / health-tests
          per the reference Screens3.jsx ServicesListScreen. */}
      <div
        className="mb-4 inline-flex items-center gap-1 border border-[var(--color-border)]"
        style={{
          padding: 4,
          background: "var(--color-background-soft)",
          borderRadius: 12,
        }}
      >
        {SERVICE_KIND_ORDER.map((option) => {
          const optionMeta = SERVICE_KIND_META[option];
          const href = optionMeta.listHref;
          const active = option === kind;
          return (
            <Link
              key={option}
              href={href}
              className="inline-flex items-center gap-2 transition-all duration-150"
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: active ? "var(--color-background-page)" : "transparent",
                color: active
                  ? "var(--color-brand-primary)"
                  : "var(--color-text-muted)",
                fontSize: 13,
                fontWeight: 700,
                boxShadow: active ? "var(--shadow-soft)" : "none",
                textDecoration: "none",
              }}
            >
              {optionMeta.label}
            </Link>
          );
        })}
      </div>

      {/* Hide redundant nav from old wrappers (general-consultations etc.). */}
      {showKindTabs ? null : null}

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
          <input type="hidden" name="kind" value={kind} />
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
            {kind === "SPECIALIST" ? (
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="gh-field-label">Category</span>
                <select
                  name="specialtyId"
                  defaultValue={filters.specialtyId ?? ""}
                  className="gh-select min-w-0"
                  disabled={!filterCountryId}
                >
                  <option value="">Any</option>
                  {specialtyOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
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
                placeholder="Name, slug, summary"
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
              href={basePath}
              className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Clear filters
            </Link>
            <span className="ml-auto text-[12px] text-[var(--color-text-muted)]">
              {total === 0
                ? `No ${meta.label.toLowerCase()} match these filters.`
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
              <Th style={{ width: 40 }}> </Th>
              <Th>Title</Th>
              <Th>Slug</Th>
              <Th>Country</Th>
              {showsCategory ? <Th>Category</Th> : null}
              <Th align="right">Price</Th>
              <Th align="right">Duration</Th>
              <Th>Status</Th>
              <Th align="right" style={{ width: 120 }}>
                Actions
              </Th>
            </Thead>
            <tbody>
              {items.map((service) => (
                <Tr key={service.id}>
                  <Td>
                    <GripVertical
                      aria-hidden
                      className="size-3.5"
                      style={{ color: "var(--color-text-muted)", cursor: "grab" }}
                    />
                  </Td>
                  <Td>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {service.name}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-[11px] text-[var(--color-text-muted)]">
                      {service.slug}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <FlagBadge code={service.country.code} size={14} />
                      <span className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                        {service.country.code}
                      </span>
                    </span>
                  </Td>
                  {showsCategory ? (
                    <Td>
                      <span className="text-[13px] text-[var(--color-text-body)]">
                        {service.specialty?.name ?? (
                          <span className="text-[var(--color-text-placeholder)]">
                            {meta.emptySpecialtyLabel}
                          </span>
                        )}
                      </span>
                    </Td>
                  ) : null}
                  <Td align="right">
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {formatMoney(service.basePriceCents, service.currencyCode)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="text-[var(--color-text-muted)]">
                      {service.durationMinutes != null
                        ? `${service.durationMinutes} min`
                        : "—"}
                    </span>
                  </Td>
                  <Td>
                    <Pill tone={service.isActive ? "published" : "draft"}>
                      {service.isActive ? "Published" : "Draft"}
                    </Pill>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1.5">
                      <IconBtn
                        ariaLabel={`View ${service.name}`}
                        href={adminHrefForService(service)}
                      >
                        <Eye className="size-3.5" aria-hidden />
                      </IconBtn>
                      <IconBtn
                        ariaLabel={`Edit ${service.name}`}
                        href={adminHrefForService(service, "edit")}
                      >
                        <Edit3 className="size-3.5" aria-hidden />
                      </IconBtn>
                      <form action={deleteServiceAction} className="inline-flex">
                        <input type="hidden" name="id" value={service.id} />
                        <ConfirmDeleteButton
                          message={`Permanently delete service "${service.name}"? This cannot be undone.`}
                          ariaLabel={`Delete ${service.name}`}
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
            No records match these filters.
          </p>
        ) : null}

        {totalPages > 1 ? (
          <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-background-soft)] px-5 py-3 text-[13px]">
            <div className="text-[var(--color-text-muted)]">
              Page {page} of {totalPages} · {pageSize} per page
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildServicesHref(basePath, filters, {
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
                href={buildServicesHref(basePath, filters, {
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

import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  fetchAdminCountries,
  fetchAdminServices,
  fetchAdminSpecialties,
  purgeAdminService,
} from "@/lib/admin/admin-api";
import {
  adminHrefForService,
  readServiceKind,
  SERVICE_KIND_META,
  SERVICE_KIND_ORDER,
} from "@/lib/admin/service-kind";

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

function spRead(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
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
  const filters: Record<string, string | undefined> = {
    page: spRead(sp, "page"),
    pageSize: spRead(sp, "pageSize"),
    kind,
    countryId: spRead(sp, "countryId"),
    specialtyId: spRead(sp, "specialtyId"),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const [listResult, countriesResult] = await Promise.all([
    fetchAdminServices(filters),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">{meta.pageTitle}</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">Could not load countries: {countriesResult.message}</p>
      </section>
    );
  }

  if (!listResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">{meta.pageTitle}</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">Could not load records: {listResult.message}</p>
      </section>
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
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{meta.pageTitle}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
            Manage image, title, price, duration, sort order, and detail content for this page family.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={meta.newHref} className="gh-btn gh-btn-primary">
            {meta.addLabel}
          </Link>

        </div>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{successMessage}</p>
      ) : null}

      {showKindTabs ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {SERVICE_KIND_ORDER.map((option) => {
            const optionMeta = SERVICE_KIND_META[option];
            const href = optionMeta.listHref;
            const active = option === kind;
            return (
              <Link
                key={option}
                href={href}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)] text-white"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)]"
                }`}
              >
                {optionMeta.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      <form method="get" className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <input type="hidden" name="kind" value={kind} />
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
          {kind === "SPECIALIST" ? (
            <label className="flex min-w-0 flex-col gap-2">
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
              placeholder="Name, slug, summary"
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
            <Link href={basePath} className="gh-link text-sm text-[var(--color-text-muted)]">
            Clear filters
          </Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        {total === 0 ? `No ${meta.label.toLowerCase()} match these filters.` : `Showing ${items.length} of ${total}.`}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-semibold">Title</th>
              <th className="px-3 py-2 font-semibold">Slug</th>
              <th className="px-3 py-2 font-semibold">Country</th>
              <th className="px-3 py-2 font-semibold">Category</th>
              <th className="px-3 py-2 font-semibold">Sort</th>
              <th className="px-3 py-2 font-semibold">Price / duration</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((service) => (
              <tr
                key={service.id}
                className={`border-b border-[var(--color-border)] align-top ${service.isActive ? "" : "opacity-60"}`}
              >
                <td className="px-3 py-3 font-medium text-[var(--color-text-primary)]">{service.name}</td>
                <td className="px-3 py-3 font-mono text-xs text-[var(--color-text-muted)]">{service.slug}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{service.country.code}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">
                  {service.specialty?.name ?? meta.emptySpecialtyLabel}
                </td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{service.sortOrder}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">
                  {formatMoney(service.basePriceCents, service.currencyCode)}
                  <span className="mx-1 text-[var(--color-border)]">|</span>
                  {service.durationMinutes != null ? `${service.durationMinutes} min` : "—"}
                </td>
                <td className="px-3 py-3">{service.isActive ? "Yes" : "No"}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <Link href={adminHrefForService(service)} className="gh-link text-[var(--color-brand-primary)]">
                      View
                    </Link>
                    <Link href={adminHrefForService(service, "edit")} className="gh-link text-[var(--color-brand-primary)]">
                      Edit
                    </Link>
                    <form action={deleteServiceAction}>
                      <input type="hidden" name="id" value={service.id} />
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

      {totalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6 text-sm">
          <div className="text-[var(--color-text-muted)]">
            Page {page} of {totalPages} · {pageSize} per page
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildServicesHref(basePath, filters, { page: String(Math.max(1, page - 1)) })}
              className={`gh-btn ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              Previous
            </Link>
            <Link
              href={buildServicesHref(basePath, filters, { page: String(Math.min(totalPages, page + 1)) })}
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

import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Edit3, Eye, Plus, Stethoscope } from "lucide-react";
import {
  fetchAdminCountries,
  fetchAdminDoctors,
  purgeAdminDoctor,
  type AdminDoctorDto,
  type AdminServiceKind,
} from "@/lib/admin/admin-api";
import { getActiveCountry, scopedCountryId } from "@/lib/admin/admin-scope";
import { SERVICE_KIND_META } from "@/lib/admin/service-kind";
import { FlagBadge } from "../_components/flag-badge";
import { ConfirmDeleteButton } from "../_components/confirm-delete-button";
import { QueryToast } from "../_components/query-toast";
import { ScopeBanner } from "../_components/scope-banner";
import { IconBtn } from "@/components/portal-atoms";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  Btn,
  PageHeader,
  Pill,
} from "../_components/atoms";

export const dynamic = "force-dynamic";

const CONSULTATION_TYPE_FILTER_ORDER: AdminServiceKind[] = [
  "GENERAL",
  "SPECIALIST",
  "PRESCRIPTION",
  "HEALTH_TEST",
];

function doctorConsultationTypeLabels(
  assignedServices: Array<{ service: { kind: AdminServiceKind } }>,
): string {
  const kinds = [
    ...new Set(assignedServices.map((row) => row.service.kind)),
  ].sort(
    (a, b) =>
      CONSULTATION_TYPE_FILTER_ORDER.indexOf(a) -
      CONSULTATION_TYPE_FILTER_ORDER.indexOf(b),
  );
  if (kinds.length === 0) return "—";
  return kinds
    .map((kind) => SERVICE_KIND_META[kind].shortLabel)
    .join(", ");
}

function doctorInitials(fullName: string): string {
  return fullName
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function doctorFields(
  deleteDoctorAction: (formData: FormData) => void | Promise<void>,
): ColumnPriorityField<AdminDoctorDto>[] {
  return [
    {
      key: "doctor",
      label: "Doctor",
      priority: 1,
      render: (d) => (
        <Link href={`/admin/doctors/${d.id}`} className="inline-flex items-center gap-3 no-underline">
          <span
            aria-hidden
            className="gh-admin-doctor-avatar inline-flex shrink-0 items-center justify-center text-white"
          >
            {doctorInitials(d.fullName) || "·"}
          </span>
          <div className="text-left">
            <p className="m-0 text-[14px] font-bold text-[var(--color-text-primary)]">{d.fullName}</p>
            <p className="m-0 font-mono text-[11px] text-[var(--color-text-muted)]">/{d.slug}</p>
          </div>
        </Link>
      ),
    },
    {
      key: "status",
      label: "Status",
      priority: 1,
      render: (d) => (
        <Pill tone={d.active ? "published" : "inactive"}>{d.active ? "Published" : "Suspended"}</Pill>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      priority: 1,
      align: "right",
      desktopOnly: true,
      render: (d) => (
        <div className="gh-admin-doctor-row-actions flex justify-end gap-1.5">
          <IconBtn ariaLabel={`View ${d.fullName}`} href={`/admin/doctors/${d.id}`}>
            <Eye className="size-3.5" aria-hidden />
          </IconBtn>
          <IconBtn ariaLabel={`Edit ${d.fullName}`} href={`/admin/doctors/${d.id}/edit`}>
            <Edit3 className="size-3.5" aria-hidden />
          </IconBtn>
          <form action={deleteDoctorAction} className="inline-flex">
            <input type="hidden" name="id" value={d.id} />
            <ConfirmDeleteButton
              title={`Delete Dr. ${d.fullName}?`}
              message={`Permanently delete doctor "${d.fullName}"? This removes their profile and cannot be undone.`}
              ariaLabel={`Delete ${d.fullName}`}
              requireTypedConfirmation={d.fullName}
            />
          </form>
        </div>
      ),
    },
    {
      key: "practicingIn",
      label: "Practicing in",
      priority: 2,
      render: (d) => {
        const flags: Array<{ code: string; name: string; isPrimary: boolean }> = [
          { code: d.country.code, name: d.country.name, isPrimary: true },
          ...d.additionalCountries
            .filter((link) => link.active && link.countryId !== d.countryId)
            .map((link) => ({ code: link.country.code, name: link.country.name, isPrimary: false })),
        ];
        return (
          <span className="inline-flex items-center gap-1.5">
            {flags.map((f) => (
              <span key={f.code} title={f.isPrimary ? `${f.name} · primary` : f.name} className="inline-flex">
                <FlagBadge code={f.code} size={18} />
              </span>
            ))}
          </span>
        );
      },
    },
    {
      key: "account",
      label: "Account",
      priority: 2,
      render: (d) => {
        if (!d.loginUser) return <Pill tone="neutral">No account</Pill>;
        if (!d.loginUser.emailVerifiedAt) return <Pill tone="pending">Pending</Pill>;
        return <Pill tone="active">Active</Pill>;
      },
    },
    {
      key: "title",
      label: "Title",
      priority: 3,
      render: (d) => <span className="text-[13px] text-[var(--color-text-body)]">{d.title}</span>,
    },
    {
      key: "languages",
      label: "Languages",
      priority: 3,
      render: (d) => (
        <span className="block max-w-[12rem] truncate text-[13px] text-[var(--color-text-body)]">
          {d.languages && d.languages.length > 0 ? d.languages.join(", ") : "—"}
        </span>
      ),
    },
    {
      key: "consultationType",
      label: "Consultation type",
      priority: 3,
      render: (d) => (
        <span className="block max-w-[12rem] truncate text-[13px] text-[var(--color-text-muted)]">
          {doctorConsultationTypeLabels(d.assignedServices ?? [])}
        </span>
      ),
    },
  ];
}

function buildDoctorsHref(
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
  return qs ? `/admin/doctors?${qs}` : "/admin/doctors";
}

function spRead(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDoctorsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};

  // Country scope (cookie) is the default countryId filter when the URL
  // doesn't already specify one. Explicit URL filters always win.
  const countriesResult = await fetchAdminCountries();
  const countriesForScope = countriesResult.ok ? countriesResult.data.countries : [];
  const activeCountry = await getActiveCountry(countriesForScope);

  const filters: Record<string, string | undefined> = {
    page: spRead(sp, "page"),
    pageSize: spRead(sp, "pageSize"),
    countryId: scopedCountryId(spRead(sp, "countryId"), activeCountry),
    serviceKind: spRead(sp, "serviceKind"),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const listResult = await fetchAdminDoctors(filters);

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Global" title="Doctor profiles" />
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
        <PageHeader eyebrow="Global" title="Doctor profiles" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load doctors: {listResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const { items, pagination } = listResult.data;
  const { page, pageSize, total, totalPages } = pagination;
  const countries = countriesResult.data.countries;
  const activeDoctors = items.filter((doctor) => doctor.active).length;
  const accountLinked = items.filter((doctor) => doctor.loginUser).length;
  const multiMarketDoctors = items.filter((doctor) =>
    doctor.additionalCountries.some((link) => link.active && link.countryId !== doctor.countryId),
  ).length;

  const statusFilter = filters.isActive ?? "";

  async function deleteDoctorAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "").trim();
    const result = await purgeAdminDoctor(id);
    if (!result.ok) {
      redirect(`/admin/doctors?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/doctors");
    redirect("/admin/doctors?success=Doctor%20profile%20deleted");
  }

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Doctors"
        description="Public clinician directory. Doctors are profiles only — patient-facing login is a separate portal."
        actions={
          <Btn
            href="/admin/doctors/create"
            variant="primary"
            size="md"
            iconLeft={<Plus className="size-3.5" aria-hidden />}
          >
            Add doctor
          </Btn>
        }
      />

      <ScopeBanner activeCountry={activeCountry} clearHref="/admin/doctors" />
      <QueryToast />

      <AdminSummaryStrip
        items={[
          { label: "Profiles", value: total, hint: `${items.length} shown`, tone: "brand" },
          { label: "Published", value: activeDoctors, hint: "Visible in directories", tone: "success" },
          { label: "Accounts", value: accountLinked, hint: `${multiMarketDoctors} multi-market`, tone: "neutral" },
        ]}
      />

      {/* Filters card */}
      <AdminCard padding={0} className="gh-admin-doctor-filters mb-4 overflow-hidden">
        <form method="get" className="px-5 py-4">
          <div className="gh-admin-doctor-filter-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <span className="gh-field-label">Consultation type</span>
              <select
                name="serviceKind"
                defaultValue={filters.serviceKind ?? ""}
                className="gh-select min-w-0"
              >
                <option value="">Any</option>
                {CONSULTATION_TYPE_FILTER_ORDER.map((kind) => (
                  <option key={kind} value={kind}>
                    {SERVICE_KIND_META[kind].singularLabel}
                  </option>
                ))}
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
                placeholder="Name, title, bio"
                className="gh-input min-w-0"
                maxLength={120}
              />
            </label>
          </div>
          <input type="hidden" name="page" value="1" />
          <div className="gh-admin-doctor-actions mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className="gh-btn gh-btn-primary gh-admin-pager-btn">
              Apply filters
            </button>
            <Link
              href="/admin/doctors"
              className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Clear filters
            </Link>
            <span className="ml-auto text-[12px] text-[var(--color-text-muted)]">
              {total === 0
                ? "No profiles match filters."
                : `Showing ${items.length} of ${total} profiles.`}
            </span>
          </div>
        </form>
      </AdminCard>

      {/* Table card */}
      <AdminCard padding={0} className="gh-admin-doctor-table-card overflow-hidden">
        {items.length > 0 ? (
          <ColumnPriorityTable<AdminDoctorDto>
            fields={doctorFields(deleteDoctorAction)}
            rows={items}
            getRowKey={(d) => d.id}
            cardTone={(d) => (d.active ? "success" : "neutral")}
            cardActions={(d) => (
              <>
                <IconBtn ariaLabel={`View ${d.fullName}`} href={`/admin/doctors/${d.id}`}>
                  <Eye className="size-3.5" aria-hidden />
                </IconBtn>
                <IconBtn ariaLabel={`Edit ${d.fullName}`} href={`/admin/doctors/${d.id}/edit`}>
                  <Edit3 className="size-3.5" aria-hidden />
                </IconBtn>
              </>
            )}
          />
        ) : null}

        {items.length === 0 ? (
          <AdminEmptyState
            icon={<Stethoscope className="size-8" aria-hidden />}
            title="No doctor profiles match these filters"
            description="Try a wider market filter or add a clinician profile with languages, services, and country availability."
            action={<Btn href="/admin/doctors/create" variant="soft" size="sm">Add doctor</Btn>}
          />
        ) : null}

        {totalPages > 1 ? (
          <nav className="gh-admin-doctor-pagination flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-background-soft)] px-5 py-3 text-[13px]">
            <div className="text-[var(--color-text-muted)]">
              Page {page} of {totalPages} · {pageSize} per page
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildDoctorsHref(filters, {
                  page: String(Math.max(1, page - 1)),
                })}
                className={`gh-btn gh-btn-soft gh-admin-pager-btn text-[13px] ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Previous
              </Link>
              <Link
                href={buildDoctorsHref(filters, {
                  page: String(Math.min(totalPages, page + 1)),
                })}
                className={`gh-btn gh-btn-primary gh-admin-pager-btn text-[13px] ${
                  page >= totalPages ? "pointer-events-none opacity-40" : ""
                }`}
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

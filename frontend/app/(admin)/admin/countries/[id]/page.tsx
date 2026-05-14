import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  deleteAdminCountry,
  fetchAdminCountryById,
  fetchAdminDoctors,
  fetchAdminServices,
  fetchAdminSpecialties,
  purgeAdminCountry,
} from "@/lib/admin/admin-api";
import { FlagBadge } from "../../_components/flag-badge";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminCountryDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminCountryById(id);

  async function deactivateCountryAction() {
    "use server";
    const updateResult = await deleteAdminCountry(id);
    if (!updateResult.ok) {
      redirect(`/admin/countries/${id}?error=${encodeURIComponent(updateResult.message)}`);
    }
    revalidatePath("/admin/countries");
    revalidatePath(`/admin/countries/${id}`);
    redirect(`/admin/countries/${id}?success=${encodeURIComponent("Country deactivated")}`);
  }

  async function deleteCountryAction() {
    "use server";
    const deleteResult = await purgeAdminCountry(id);
    if (!deleteResult.ok) {
      redirect(`/admin/countries/${id}?error=${encodeURIComponent(deleteResult.message)}`);
    }
    revalidatePath("/admin/countries");
    redirect(`/admin/countries?success=${encodeURIComponent("Country deleted")}`);
  }

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Country"
          actions={
            <Btn href="/admin/countries" variant="ghost" size="md" iconLeft={<ArrowLeft className="size-3.5" />}>
              Back
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load country: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const c = result.data.country;
  const isActive = c.isActive;

  // Live stats for the sidebar — match the reference Country edit screen
  // (Doctors / Services / Categories / Pending bookings counts).
  const [doctorsRes, servicesRes, specialtiesRes] = await Promise.all([
    fetchAdminDoctors({ countryId: c.id, pageSize: "1" }),
    fetchAdminServices({ countryId: c.id, pageSize: "1" }),
    fetchAdminSpecialties(c.id),
  ]);
  const stats = {
    doctors: doctorsRes.ok ? doctorsRes.data.pagination.total : 0,
    services: servicesRes.ok ? servicesRes.data.pagination.total : 0,
    categories: specialtiesRes.ok
      ? specialtiesRes.data.specialties.filter((s) => s.active).length
      : 0,
    totalCategories: specialtiesRes.ok ? specialtiesRes.data.specialties.length : 0,
  };

  return (
    <>
      <Link
        href="/admin/countries"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to countries
      </Link>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={c.code} size={14} />
            Edit country
          </span>
        }
        title={c.name}
        description="The row everything else hangs off — services, doctors, categories, appointments."
        actions={
          <>
            <Pill tone={isActive ? "published" : "inactive"}>
              {isActive ? "Active" : "Inactive"}
            </Pill>
            <Btn href={`/admin/countries/${id}/edit`} variant="primary" size="md">
              Edit
            </Btn>
          </>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.success}
        </p>
      ) : null}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        {/* Main column */}
        <div className="grid gap-4">
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Identifiers
            </h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Used in URLs, billing, and DB joins.
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Country code" value={c.code.toUpperCase()} mono />
              <Field label="URL slug" value={c.slug} mono />
              <Field label="Default locale" value={c.defaultLocale} />
              <Field
                label="Supported locales"
                value={c.countryLocales.map((l) => l.locale).join(", ") || "—"}
              />
              <Field
                label="Currency"
                value={`${c.currency.code} (${c.currency.symbol})`}
              />
            </dl>
          </AdminCard>

          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Public routes
            </h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Paths the public site uses to reach this country.
            </p>
            <ul className="grid gap-2 font-mono text-[12.5px] text-[var(--color-text-body)]">
              <li className="rounded-md bg-[var(--color-background-soft)] px-3 py-2">
                {c.legacyHomePath}
              </li>
              <li className="rounded-md bg-[var(--color-background-soft)] px-3 py-2">
                {c.teamPath}
              </li>
              <li className="rounded-md bg-[var(--color-background-soft)] px-3 py-2">
                {c.generalConsultationPath}
              </li>
              <li className="rounded-md bg-[var(--color-background-soft)] px-3 py-2">
                {c.specialistConsultationPath}
              </li>
            </ul>
          </AdminCard>

          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Domains
            </h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Hostnames mapped to this country.
            </p>
            {c.domains.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">None configured.</p>
            ) : (
              <ul className="grid gap-2 font-mono text-[12.5px]">
                {c.domains.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded-md bg-[var(--color-background-soft)] px-3 py-2"
                  >
                    <span>{d.domain}</span>
                    {d.isPrimary ? <Pill tone="brand">Primary</Pill> : null}
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>

        {/* Sidebar */}
        <div className="grid gap-4 self-start">
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Visibility
            </h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Pull this country off the public site without losing data.
            </p>

            {isActive ? (
              <form action={deactivateCountryAction}>
                <p className="mb-3 text-[13px] text-[var(--color-text-muted)]">
                  Soft-deactivate hides the country from the public countries API. Re-enable from Edit.
                </p>
                <button type="submit" className="gh-btn gh-btn-danger w-full">
                  Deactivate country
                </button>
              </form>
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                This country is inactive. Re-enable from Edit.
              </p>
            )}
          </AdminCard>

          {/* Stats card — counts of doctors, services, categories */}
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Stats
            </h3>
            <div className="mt-3 grid gap-1">
              {(
                [
                  ["Doctors assigned", String(stats.doctors)],
                  ["Services published", String(stats.services)],
                  [
                    "Categories enabled",
                    `${stats.categories} / ${stats.totalCategories}`,
                  ],
                ] as const
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between"
                  style={{
                    padding: "10px 0",
                    borderTop: "1px solid var(--color-border)",
                  }}
                >
                  <span className="text-[13px] text-[var(--color-text-muted)]">
                    {k}
                  </span>
                  <span className="text-[13px] font-bold text-[var(--color-text-primary)]">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard>
            <h3
              className="m-0"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
                color: "var(--color-status-error-text)",
              }}
            >
              Danger zone
            </h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Permanent delete removes this country and dependent admin content.
            </p>
            <form action={deleteCountryAction}>
              <button type="submit" className="gh-btn gh-btn-danger w-full">
                Delete permanently
              </button>
            </form>
          </AdminCard>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd
        className="mt-1 text-[14px] text-[var(--color-text-primary)]"
        style={mono ? { fontFamily: "ui-monospace, monospace" } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

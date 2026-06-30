import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import {
  deleteAdminCountry,
  fetchAdminCountryById,
  fetchAdminDoctors,
  fetchAdminGpSettings,
  fetchAdminServices,
  fetchAdminSpecialties,
  purgeAdminCountry,
  updateAdminGpSettings,
} from "@/lib/admin/admin-api";
import { FlagBadge } from "../../_components/flag-badge";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";

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
    await requireAdminAction();
    const updateResult = await deleteAdminCountry(id);
    if (!updateResult.ok) {
      redirect(`/admin/countries/${id}?error=${encodeURIComponent(updateResult.message)}`);
    }
    revalidatePath("/admin/countries");
    revalidatePath(`/admin/countries/${id}`);
    revalidateTag(SITE_CACHE_TAGS.countries(), "max");
    redirect(`/admin/countries/${id}?success=${encodeURIComponent("Country deactivated")}`);
  }

  async function deleteCountryAction() {
    "use server";
    await requireAdminAction();
    const deleteResult = await purgeAdminCountry(id);
    if (!deleteResult.ok) {
      redirect(`/admin/countries/${id}?error=${encodeURIComponent(deleteResult.message)}`);
    }
    revalidatePath("/admin/countries");
    revalidateTag(SITE_CACHE_TAGS.countries(), "max");
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

  // Same-day GP quick-book config (which GENERAL service the homepage
  // timeslot-first flow books + the priority/Tiago doctor for the 24h window).
  const gpSettingsRes = await fetchAdminGpSettings(c.code);
  const gp = gpSettingsRes.ok ? gpSettingsRes.data : null;

  async function saveGpSettingsAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const rawService = String(formData.get("sameDayServiceId") ?? "").trim();
    const rawDoctor = String(formData.get("priorityDoctorId") ?? "").trim();
    const res = await updateAdminGpSettings(c.code, {
      sameDayServiceId: rawService === "" ? null : rawService,
      priorityDoctorId: rawDoctor === "" ? null : rawDoctor,
    });
    if (!res.ok) {
      redirect(`/admin/countries/${id}?error=${encodeURIComponent(res.message)}`);
    }
    revalidatePath(`/admin/countries/${id}`);
    redirect(`/admin/countries/${id}?success=${encodeURIComponent("Same-day GP settings saved")}`);
  }

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
            <Btn href={`/admin/countries/${id}/legal`} variant="soft" size="md">
              Legal profile
            </Btn>
            <Btn href={`/admin/countries/${id}/legal-documents`} variant="soft" size="md">
              Legal docs
            </Btn>
            <Btn href={`/admin/countries/${id}/landing-pages`} variant="soft" size="md">
              SEO pages
            </Btn>
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

      <div className="gh-admin-country-detail-layout grid gap-4">
        {/* Main column */}
        <div className="gh-admin-country-detail-main grid gap-4">
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
            <dl className="gh-admin-country-facts grid gap-4 sm:grid-cols-2">
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
            <ul className="gh-admin-country-route-list grid gap-2 font-mono text-[12.5px] text-[var(--color-text-body)]">
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
              <ul className="gh-admin-country-domain-list grid gap-2 font-mono text-[12.5px]">
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

          {/* Same-day GP quick-book config */}
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Same-day GP booking
            </h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              The homepage timeslot-first flow auto-assigns a GP. Choose which
              GENERAL service it books and (optionally) the priority doctor who
              gets first refusal inside the 24-hour window.
            </p>
            {!gp ? (
              <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
                Could not load GP settings{gpSettingsRes.ok ? "" : `: ${gpSettingsRes.message}`}
              </p>
            ) : gp.generalServices.length === 0 ? (
              <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
                No active GENERAL service in this country yet. Create one before
                the same-day flow can run.
              </p>
            ) : (
              <form action={saveGpSettingsAction} className="gh-admin-country-gp-form grid gap-4">
                <label className="grid gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Same-day GP service
                  </span>
                  <select
                    name="sameDayServiceId"
                    defaultValue={gp.sameDayServiceId ?? ""}
                    className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]"
                  >
                    <option value="">Auto — first GENERAL service</option>
                    {gp.generalServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                    Priority doctor (24h window)
                  </span>
                  <select
                    name="priorityDoctorId"
                    defaultValue={gp.priorityDoctorId ?? ""}
                    className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-page)] px-3 py-2 text-[14px] text-[var(--color-text-primary)]"
                  >
                    <option value="">None — pure rotation</option>
                    {gp.gpDoctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.fullName}
                        {d.languages.length > 0 ? ` (${d.languages.join(", ")})` : ""}
                      </option>
                    ))}
                  </select>
                  {gp.gpDoctors.length === 0 ? (
                    <span className="text-[12px] text-[var(--color-text-muted)]">
                      No doctors are assigned to the same-day service yet.
                    </span>
                  ) : null}
                </label>

                <div>
                  <button type="submit" className="gh-btn gh-btn-primary">
                    Save GP settings
                  </button>
                </div>
              </form>
            )}
          </AdminCard>
        </div>

        {/* Sidebar */}
        <div className="gh-admin-country-detail-side grid gap-4 self-start">
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
            <div className="gh-admin-country-stats mt-3 grid gap-1">
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
              <ConfirmDeleteButton
                message="Permanently delete this country and all its dependent admin content? This cannot be undone."
                className="gh-btn gh-btn-danger w-full"
                ariaLabel="Delete country permanently"
              >
                Delete permanently
              </ConfirmDeleteButton>
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

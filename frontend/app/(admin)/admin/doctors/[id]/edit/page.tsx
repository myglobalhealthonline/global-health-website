import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { FlagBadge } from "../../../_components/flag-badge";
import { DoctorFields } from "../../_components/doctor-fields";
import { parseDoctorBodyFromForm } from "@/lib/admin/doctor-form-parse";
import {
  fetchAdminCountries,
  fetchAdminDoctorById,
  fetchAdminDoctors,
  fetchAdminSpecialties,
  patchAdminDoctor,
} from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import {
  detectDuplicateTextIssues,
  validateAdminDoctorPayload,
} from "@/lib/content/publication-validation";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditDoctorPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [doctorResult, countriesResult] = await Promise.all([
    fetchAdminDoctorById(id),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Edit doctor profile"
          actions={
            <Btn href="/admin/doctors" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  if (!doctorResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Edit doctor profile"
          actions={
            <Btn href="/admin/doctors" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load doctor: {doctorResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const doctor = doctorResult.data.doctor;
  const specialtiesResult = await fetchAdminSpecialties(doctor.countryId);

  if (!specialtiesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title={`Edit ${doctor.fullName}`}
          actions={
            <Btn href={`/admin/doctors/${id}`} variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load categories: {specialtiesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  async function updateDoctorAction(formData: FormData) {
    "use server";

    const raw = parseDoctorBodyFromForm(formData);
    const body = {
      slug: raw.slug,
      fullName: raw.fullName,
      title: raw.title,
      bio: raw.bio.trim() === "" ? null : raw.bio.trim(),
      imcRegistration: raw.imcRegistration === "" ? null : raw.imcRegistration,
      medicalRegistrationUrl:
        raw.medicalRegistrationUrl === "" ? null : raw.medicalRegistrationUrl,
      qualifications: raw.qualifications,
      whatsappNumber: raw.whatsappNumber === "" ? null : raw.whatsappNumber,
      languages: raw.languages,
      specialtyIds: raw.specialtyIds,
      profileImagePath: raw.profileImagePath === "" ? null : raw.profileImagePath,
      active: raw.active,
    };

    const [existingDoctors, validation] = await Promise.all([
      fetchAdminDoctors({ countryId: doctor.countryId, pageSize: "250" }),
      Promise.resolve(
        validateAdminDoctorPayload({
          fullName: body.fullName,
          title: body.title,
          bio: body.bio,
          languages: body.languages,
          imcRegistration: body.imcRegistration,
          medicalRegistrationUrl: body.medicalRegistrationUrl,
          qualifications: body.qualifications,
          specialties: body.specialtyIds,
        }),
      ),
    ]);
    const duplicateIssues = existingDoctors.ok
      ? detectDuplicateTextIssues(
          { id, title: body.fullName, description: body.bio },
          existingDoctors.data.items.map((item) => ({
            id: item.id,
            title: item.fullName,
            description: item.bio,
          })),
        )
      : [];
    const issues = [...validation.issues, ...duplicateIssues];

    const result = await patchAdminDoctor(id, body);
    if (!result.ok) {
      redirect(`/admin/doctors/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }

    // Bust public Data Cache for this doctor's country roster and slug-specific
    // page so the public site refreshes immediately.
    const saved = result.data.doctor;
    if (saved.country?.code) {
      revalidateTag(SITE_CACHE_TAGS.countryDoctors(saved.country.code), "max");
      revalidateTag(
        SITE_CACHE_TAGS.countryDoctorBySlug(saved.country.code, saved.slug),
        "max",
      );
    }
    revalidateTag(SITE_CACHE_TAGS.globalDoctors(), "max");

    redirect(
      `/admin/doctors/${id}?success=${encodeURIComponent(
        issues.length > 0
          ? "Doctor profile updated with editorial warnings"
          : "Doctor profile updated",
      )}`,
    );
  }

  return (
    <>
      <Link
        href={`/admin/doctors/${id}`}
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {doctor.fullName}
      </Link>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={doctor.country.code} size={14} /> Edit doctor
          </span>
        }
        title={doctor.fullName}
        description="One doctor, multiple countries. Toggle active per-country to suspend in one place without hiding everywhere."
        actions={
          <>
            <Pill tone={doctor.active ? "published" : "draft"}>
              {doctor.active ? "Published" : "Draft"}
            </Pill>
            <Btn href={`/admin/doctors/${id}`} variant="ghost">
              Cancel
            </Btn>
          </>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        {/* Main column — form */}
        <AdminCard>
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            Profile
          </h3>
          <p className="mb-5 mt-1 text-[13px] text-[var(--color-text-muted)]">
            Public-facing profile shown on the country team page.
          </p>
          <form action={updateDoctorAction} className="flex flex-col gap-8">
            <DoctorFields
              countries={countries}
              specialties={specialtiesResult.data.specialties}
              initial={doctor}
              countryLocked
            />
            <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-6">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save changes
              </button>
              <Link
                href={`/admin/doctors/${id}`}
                className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              >
                Cancel
              </Link>
            </div>
          </form>
        </AdminCard>

        {/* Right sidebar — visibility + practicing-in */}
        <div className="grid gap-4 self-start">
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Profile photo
            </h3>
            <p className="mb-3 mt-1 text-[13px] text-[var(--color-text-muted)]">
              800×800 recommended.
            </p>
            <div
              aria-hidden
              className="grid place-items-center text-white"
              style={{
                aspectRatio: "1 / 1",
                width: "100%",
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, var(--color-brand-primary), var(--color-accent))",
                fontFamily: "var(--font-display)",
                fontSize: 48,
                fontWeight: 800,
              }}
            >
              {doctor.fullName
                .replace(/^Dr\.?\s+/i, "")
                .split(/\s+/)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase() ?? "")
                .join("") || "·"}
            </div>
          </AdminCard>

          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Practicing in
            </h3>
            <p className="mb-2 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Active controls visibility per country; sort order ranks the doctor on each country team page.
            </p>
            <div
              className="flex items-center gap-2.5 border-t border-[var(--color-border)] py-3"
              style={{ borderTopStyle: "solid" }}
            >
              <FlagBadge code={doctor.country.code} size={16} />
              <div className="flex-1">
                <p className="m-0 text-[13px] font-bold text-[var(--color-text-primary)]">
                  {doctor.country.name}
                </p>
                <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
                  {doctor.active ? "Active" : "Inactive"}
                </p>
              </div>
              <span
                className="inline-flex items-center"
                aria-hidden
                style={{
                  width: 38,
                  height: 22,
                  borderRadius: 999,
                  background: doctor.active
                    ? "var(--color-brand-primary)"
                    : "var(--color-border-strong)",
                  padding: 2,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: doctor.active ? "calc(100% - 20px)" : 2,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.20)",
                  }}
                />
              </span>
            </div>
            <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
              Multi-country assignments require the v2 schema (Doctor ↔ Country M:N).
            </p>
          </AdminCard>
        </div>
      </div>
    </>
  );
}

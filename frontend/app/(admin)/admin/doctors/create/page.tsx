import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { DoctorFields } from "../_components/doctor-fields";
import { DoctorProfileImageField } from "../_components/doctor-profile-image-field";
import { parseDoctorBodyFromForm } from "@/lib/admin/doctor-form-parse";
import {
  fetchAdminCountries,
  fetchAdminDoctors,
  fetchAdminSpecialties,
  postAdminDoctor,
} from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import {
  detectDuplicateTextIssues,
  validateAdminDoctorPayload,
} from "@/lib/content/publication-validation";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ countryId?: string; error?: string }>;
};

export default async function AdminCreateDoctorPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const createError = sp.error;
  const countryId = sp.countryId?.trim();

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="New doctor profile"
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

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  if (!countryId) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="New doctor profile"
          description="Choose a country first — categories are loaded for that country only."
          actions={
            <Btn href="/admin/doctors" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select
                name="countryId"
                className="gh-select min-w-[240px]"
                required
                defaultValue=""
              >
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="gh-btn gh-btn-primary">
              Continue
            </button>
          </form>
        </AdminCard>
      </>
    );
  }

  const specialtiesResult = await fetchAdminSpecialties(countryId);
  if (!specialtiesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="New doctor profile"
          actions={
            <Btn href="/admin/doctors" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
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

  async function createDoctorAction(formData: FormData) {
    "use server";

    const raw = parseDoctorBodyFromForm(formData);
    const body = {
      countryId: raw.countryId,
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
      seoTitle: raw.seoTitle === "" ? null : raw.seoTitle,
      seoDescription: raw.seoDescription === "" ? null : raw.seoDescription,
      specialtyIds: raw.specialtyIds,
      // M:N additional country listings (primary stays on Doctor.countryId).
      additionalCountryIds: raw.additionalCountryIds,
      ...(raw.profileImagePath === "" ? {} : { profileImagePath: raw.profileImagePath }),
      active: raw.active,
    };

    const [existingDoctors, validation] = await Promise.all([
      fetchAdminDoctors({ countryId: raw.countryId, pageSize: "250" }),
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
          { title: body.fullName, description: body.bio },
          existingDoctors.data.items.map((item) => ({
            id: item.id,
            title: item.fullName,
            description: item.bio,
          })),
        )
      : [];
    const issues = [...validation.issues, ...duplicateIssues];

    const result = await postAdminDoctor(body);
    if (!result.ok) {
      redirect(
        `/admin/doctors/create?countryId=${encodeURIComponent(raw.countryId)}&error=${encodeURIComponent(result.message)}`,
      );
    }

    // Bust public Data Cache for the country's doctor roster so the new card
    // appears on the public site immediately.
    const created = result.data.doctor;
    if (created.country?.code) {
      revalidateTag(SITE_CACHE_TAGS.countryDoctors(created.country.code), "max");
    }
    revalidateTag(SITE_CACHE_TAGS.globalDoctors(), "max");

    redirect(
      `/admin/doctors/${result.data.doctor.id}?success=${encodeURIComponent(
        issues.length > 0
          ? "Doctor profile created with editorial warnings"
          : "Doctor profile created",
      )}`,
    );
  }

  return (
    <>
      <Link
        href="/admin/doctors"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to doctors
      </Link>
      <PageHeader
        eyebrow="Global"
        title="New doctor profile"
        description="Public marketing profile — not a login account."
        actions={
          <Btn href="/admin/doctors/create" variant="ghost">
            Change country
          </Btn>
        }
      />

      {createError ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {createError}
        </p>
      ) : null}

      <AdminCard>
        <form action={createDoctorAction} className="flex flex-col gap-8">
          <DoctorFields
            countries={countries}
            specialties={specialtiesResult.data.specialties}
            pinnedCountryId={countryId}
          />
          {/* Create flow has no right sidebar — mount the picker inline.
              No formId needed; the hidden input is already a child of
              this <form>. */}
          <DoctorProfileImageField />
          <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Create profile
            </button>
            <Link
              href="/admin/doctors"
              className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </AdminCard>
    </>
  );
}

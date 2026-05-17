import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { FlagBadge } from "../../../_components/flag-badge";
import { DoctorFields } from "../../_components/doctor-fields";
import { DoctorProfileImageField } from "../../_components/doctor-profile-image-field";
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
      seoTitle: raw.seoTitle === "" ? null : raw.seoTitle,
      seoDescription: raw.seoDescription === "" ? null : raw.seoDescription,
      specialtyIds: raw.specialtyIds,
      // M:N additional country listings (primary stays on Doctor.countryId).
      additionalCountryIds: raw.additionalCountryIds,
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

    // Bust public Data Cache for this doctor's country roster + slug page
    // so the public site refreshes immediately. Also bust the rosters for
    // every linked-country code so the multi-country update surfaces.
    const saved = result.data.doctor;
    if (saved.country?.code) {
      revalidateTag(SITE_CACHE_TAGS.countryDoctors(saved.country.code), "max");
      revalidateTag(
        SITE_CACHE_TAGS.countryDoctorBySlug(saved.country.code, saved.slug),
        "max",
      );
    }
    for (const link of saved.additionalCountries ?? []) {
      const code = link.country?.code;
      if (code) {
        revalidateTag(SITE_CACHE_TAGS.countryDoctors(code), "max");
      }
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
          {/* `id` is referenced by the Practicing-in checkboxes in the
              right sidebar via their `form="doctor-edit-form"` attribute,
              so toggling a country in that card still submits with this
              form even though it lives outside the <form> element. */}
          <form
            id="doctor-edit-form"
            action={updateDoctorAction}
            className="flex flex-col gap-8"
          >
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
              800×800 recommended. Upload or drop an image — saves with the
              rest of the form.
            </p>
            {/* DoctorProfileImageField renders the preview + Replace +
                Remove overlay. The picker lives in the right sidebar
                (separate from the <form>), so it ties back to the form
                via HTML5 form-association on its hidden input. */}
            <DoctorProfileImageField
              initialPath={doctor.assets[0]?.path ?? ""}
              fullName={doctor.fullName}
              formId="doctor-edit-form"
            />
          </AdminCard>

          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Practicing in
            </h3>
            <p className="mb-2 mt-1 text-[13px] text-[var(--color-text-muted)]">
              The primary country is fixed and scopes the URL slug. Tick any
              additional countries you want this profile to appear in — they
              save as part of the main form submit.
            </p>
            {countriesResult.data.countries.map((c) => {
              const isPrimary = c.id === doctor.countryId;
              const isLinked = doctor.additionalCountries.some(
                (link) => link.countryId === c.id && link.active,
              );
              const checked = isPrimary || isLinked;
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2.5 border-t border-[var(--color-border)] py-3"
                  style={{
                    cursor: isPrimary ? "default" : "pointer",
                    opacity: isPrimary ? 1 : 1,
                  }}
                >
                  <FlagBadge code={c.code} size={16} />
                  <div className="flex-1">
                    <p className="m-0 text-[13px] font-bold text-[var(--color-text-primary)]">
                      {c.name}
                    </p>
                    <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
                      {isPrimary
                        ? "Primary country (locked)"
                        : checked
                          ? "Linked listing"
                          : "Not listed here"}
                    </p>
                  </div>
                  {/* `form="doctor-edit-form"` ties this input to the
                      <form> in the left column so it submits with the
                      rest even though it's physically in the right
                      sidebar. The primary country has its own `countryId`
                      input from DoctorFields, so we don't POST its id
                      here — the disabled primary toggle is visual only. */}
                  <input
                    type="checkbox"
                    form="doctor-edit-form"
                    name="additionalCountryIds"
                    value={c.id}
                    defaultChecked={checked}
                    disabled={isPrimary}
                    className="h-5 w-5 rounded border-[var(--color-border)] accent-[var(--color-brand-primary)]"
                    title={
                      isPrimary
                        ? "Change the primary country via the Country field above."
                        : `Toggle ${c.name} listing`
                    }
                  />
                </label>
              );
            })}
            <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
              Toggling a country off removes this doctor from that country&apos;s
              public roster (their profile stays intact under the primary
              country).
            </p>
          </AdminCard>
        </div>
      </div>
    </>
  );
}

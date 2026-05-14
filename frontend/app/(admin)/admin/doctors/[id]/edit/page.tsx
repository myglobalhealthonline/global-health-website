import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DoctorFields } from "../../_components/doctor-fields";
import { parseDoctorBodyFromForm } from "@/lib/admin/doctor-form-parse";
import {
  fetchAdminCountries,
  fetchAdminDoctorById,
  fetchAdminDoctors,
  fetchAdminSpecialties,
  patchAdminDoctor,
} from "@/lib/admin/admin-api";
import {
  detectDuplicateTextIssues,
  validateAdminDoctorPayload,
} from "@/lib/content/publication-validation";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";

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
        eyebrow="Global"
        title={`Edit ${doctor.fullName}`}
        description="Public marketing profile — not a login account."
        actions={
          <Btn href={`/admin/doctors/${id}`} variant="ghost">
            Cancel
          </Btn>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}

      <AdminCard>
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
    </>
  );
}

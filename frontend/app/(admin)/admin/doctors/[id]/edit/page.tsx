import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { FlagBadge } from "../../../_components/flag-badge";
import { DoctorFields } from "../../_components/doctor-fields";
import { DoctorProfileImageField } from "../../_components/doctor-profile-image-field";
import { DoctorCountryProfileEditor } from "../../_components/doctor-country-profile-editor";
import { parseDoctorBodyFromForm } from "@/lib/admin/doctor-form-parse";
import { resolveCountryLocaleTabs } from "@/lib/admin/service-form-parse";
import {
  fetchAdminCountries,
  fetchAdminDoctorById,
  fetchAdminDoctorMarkets,
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
  searchParams?: Promise<{ error?: string; success?: string }>;
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
  const [specialtiesResult, marketsResult] = await Promise.all([
    fetchAdminSpecialties(doctor.countryId),
    fetchAdminDoctorMarkets(id),
  ]);
  const markets = marketsResult.ok ? marketsResult.data.markets : [];

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
  const { locales, defaultLocale } = resolveCountryLocaleTabs(
    countriesResult.data.countries.find((c) => c.id === doctor.countryId),
  );

  async function updateDoctorAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    // Title, bio and SEO are managed per country (DoctorCountryProfileEditor),
    // not here — the main form only owns identity + routing fields, so it must
    // not submit (and thereby wipe) the doctor-level title/bio/SEO.
    const raw = parseDoctorBodyFromForm(formData, defaultLocale);
    const body = {
      countryId: raw.countryId,
      slug: raw.slug,
      fullName: raw.fullName,
      medicalRegistrationUrl:
        raw.medicalRegistrationUrl === "" ? null : raw.medicalRegistrationUrl,
      qualifications: raw.qualifications,
      whatsappNumber: raw.whatsappNumber === "" ? null : raw.whatsappNumber,
      languages: raw.languages,
      // Specialties are not edited on this form anymore; omit specialtyIds so
      // the backend preserves the existing assignments (it only re-syncs when
      // specialtyIds is provided or the primary country changes).
      additionalCountryIds: raw.additionalCountryIds,
      profileImagePath: raw.profileImagePath === "" ? null : raw.profileImagePath,
      profileImageAltText:
        raw.profileImageAltText === "" ? null : raw.profileImageAltText,
      profileImageTitle:
        raw.profileImageTitle === "" ? null : raw.profileImageTitle,
      profileImageCaption:
        raw.profileImageCaption === "" ? null : raw.profileImageCaption,
      profileImageDescription:
        raw.profileImageDescription === "" ? null : raw.profileImageDescription,
      profileImageFocalX: raw.profileImageFocalX,
      profileImageFocalY: raw.profileImageFocalY,
      profileImageZoom: raw.profileImageZoom,
      active: raw.active,
      canCreateManualAppointments: raw.canCreateManualAppointments,
      canRequestCrossJurisdictionRx: raw.canRequestCrossJurisdictionRx,
    };

    const [existingDoctors, validation] = await Promise.all([
      fetchAdminDoctors({ countryId: doctor.countryId, pageSize: "250" }),
      Promise.resolve(
        validateAdminDoctorPayload({
          fullName: body.fullName,
          title: doctor.title,
          bio: doctor.bio,
          languages: body.languages,
          medicalRegistrationUrl: body.medicalRegistrationUrl,
          qualifications: body.qualifications,
          specialties: doctor.specialties.map((s) => s.specialtyId),
        }),
      ),
    ]);
    const duplicateIssues = existingDoctors.ok
      ? detectDuplicateTextIssues(
          { id, title: body.fullName, description: doctor.bio },
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
    // When the primary country changed, the OLD country's roster and
    // slug-scoped profile cache must also be busted — otherwise visitors
    // hitting /<old>/<lang>/doctors or /<old>/<lang>/doctors/<slug>
    // keep seeing the moved doctor in cached HTML indefinitely.
    const change = result.data.countryChange;
    if (change?.fromCountryCode) {
      revalidateTag(
        SITE_CACHE_TAGS.countryDoctors(change.fromCountryCode),
        "max",
      );
      revalidateTag(
        SITE_CACHE_TAGS.countryDoctorBySlug(change.fromCountryCode, saved.slug),
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
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
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
      {messages.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.success}
        </p>
      ) : null}

      <div className="gh-admin-doctor-detail-layout grid gap-4">
        {/* Main column — identity form, then per-country profile editor */}
        <div className="grid gap-4">
          <AdminCard className="gh-admin-doctor-form-card">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            Profile
          </h3>
          <p className="mb-5 mt-1 text-portal-compact text-[var(--color-text-muted)]">
            Public-facing profile shown on the country team page.
          </p>
          {/* `id` is referenced by the Practicing-in checkboxes in the
              right sidebar via their `form="doctor-edit-form"` attribute,
              so toggling a country in that card still submits with this
              form even though it lives outside the <form> element. */}
          <form
            id="doctor-edit-form"
            action={updateDoctorAction}
            className="gh-admin-doctor-form flex flex-col gap-8"
          >
            <DoctorFields
              countries={countries}
              specialties={specialtiesResult.data.specialties}
              initial={doctor}
              locales={locales}
              defaultLocale={defaultLocale}
              showTranslationTabs={false}
              showSpecialties={false}
            />
            <div className="gh-admin-doctor-form-actions gh-portal-sticky-actions flex flex-wrap justify-end gap-3 border-t border-[var(--portal-line)] pt-6">
              <Link
                href={`/admin/doctors/${id}`}
                className="gh-btn gh-btn-ghost"
              >
                Cancel
              </Link>
              <button type="submit" className="gh-btn gh-btn-primary">
                Save changes
              </button>
            </div>
          </form>
          </AdminCard>

          <DoctorCountryProfileEditor
            doctorId={id}
            doctorSlug={doctor.slug}
            markets={markets}
          />
        </div>

        {/* Right sidebar — visibility + practicing-in */}
        <div className="gh-admin-doctor-side-stack grid gap-4 self-start">
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Profile photo
            </h3>
            <p className="mb-3 mt-1 text-portal-compact text-[var(--color-text-muted)]">
              800×800 recommended. Upload or drop an image — saves with the
              rest of the form.
            </p>
            {/* DoctorProfileImageField renders the preview + Replace +
                Remove overlay. The picker lives in the right sidebar
                (separate from the <form>), so it ties back to the form
                via HTML5 form-association on its hidden input. */}
            <DoctorProfileImageField
              initialPath={doctor.assets[0]?.path ?? ""}
              initialAltText={doctor.assets[0]?.altText ?? ""}
              initialTitle={doctor.assets[0]?.title ?? ""}
              initialCaption={doctor.assets[0]?.caption ?? ""}
              initialDescription={doctor.assets[0]?.description ?? ""}
              initialFocalX={doctor.assets[0]?.focalX}
              initialFocalY={doctor.assets[0]?.focalY}
              initialZoom={doctor.assets[0]?.zoom}
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
            <p className="mb-2 mt-1 text-portal-compact text-[var(--color-text-muted)]">
              Tick any additional countries to list this doctor there. To change
              the primary country, use the Country dropdown in the main form.
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
                  className="gh-admin-doctor-country-row flex items-center gap-2.5 border-t border-[var(--color-border)] py-3"
                  style={{ cursor: isPrimary ? "default" : "pointer" }}
                >
                  <FlagBadge code={c.code} size={16} />
                  <div className="flex-1">
                    <p className="m-0 text-portal-compact font-bold text-[var(--color-text-primary)]">
                      {c.name}
                    </p>
                    <p className="m-0 text-portal-meta text-[var(--color-text-muted)]">
                      {isPrimary
                        ? "Primary — change via Country field"
                        : checked
                          ? "Linked listing"
                          : "Not listed here"}
                    </p>
                  </div>
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
                        ? "Change the primary country via the Country dropdown in the form."
                        : `Toggle ${c.name} listing`
                    }
                  />
                </label>
              );
            })}
            <p className="mt-3 text-portal-thead text-[var(--color-text-muted)]">
              Use the Country dropdown in the main form to change the primary
              country. Tick additional countries to list this doctor there too.
            </p>
            {/* Countries live in the sidebar but submit through the main
                `doctor-edit-form` (via the checkboxes' `form` attribute
                above) — this button just makes that save reachable without
                scrolling back to the Profile card. */}
            <button
              type="submit"
              form="doctor-edit-form"
              className="gh-btn gh-btn-primary mt-4 w-full"
            >
              Save changes
            </button>
          </AdminCard>

          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Permissions
            </h3>
            <p className="mb-3 mt-1 text-portal-compact text-[var(--color-text-muted)]">
              Extra capabilities granted to this doctor&apos;s portal account.
              Admins always bypass these flags.
            </p>
            <label className="flex cursor-pointer items-start gap-2.5 border-t border-[var(--color-border)] py-3">
              <input
                type="checkbox"
                form="doctor-edit-form"
                name="canCreateManualAppointments"
                defaultChecked={Boolean(doctor.canCreateManualAppointments)}
                className="mt-0.5 h-5 w-5 rounded border-[var(--color-border)] accent-[var(--color-brand-primary)]"
              />
              <div className="flex-1">
                <p className="m-0 text-portal-compact font-bold text-[var(--color-text-primary)]">
                  Can create manual appointments
                </p>
                <p className="m-0 text-portal-meta text-[var(--color-text-muted)]">
                  When on, the doctor sees a &ldquo;New appointment&rdquo;
                  action in their portal and can book on behalf of patients
                  without going through the public flow.
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 border-t border-[var(--color-border)] py-3">
              <input
                type="checkbox"
                form="doctor-edit-form"
                name="canRequestCrossJurisdictionRx"
                defaultChecked={Boolean(doctor.canRequestCrossJurisdictionRx)}
                className="mt-0.5 h-5 w-5 rounded border-[var(--color-border)] accent-[var(--color-brand-primary)]"
              />
              <div className="flex-1">
                <p className="m-0 text-portal-compact font-bold text-[var(--color-text-primary)]">
                  Can request prescriptions outside jurisdiction
                </p>
                <p className="m-0 text-portal-meta text-[var(--color-text-muted)]">
                  When on, the doctor sees a &ldquo;Request prescription outside
                  jurisdiction&rdquo; action in the consultation and can refer a
                  patient to an authorised prescribing doctor in another country.
                </p>
              </div>
            </label>
          </AdminCard>
        </div>
      </div>
    </>
  );
}

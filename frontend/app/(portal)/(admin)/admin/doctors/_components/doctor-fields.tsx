import type { AdminCountryDto, AdminDoctorDto, AdminSpecialtyOptionDto } from "@/lib/admin/admin-api";
import { LanguageMultiSelect } from "./language-multiselect";
import { DoctorTranslationTabs } from "./doctor-translation-tabs";
import { PhoneField } from "@/components/forms/phone-field";
import { FormSection } from "@/components/FormSection";

type Props = {
  countries: Pick<AdminCountryDto, "id" | "code" | "name">[];
  specialties: AdminSpecialtyOptionDto[];
  initial?: AdminDoctorDto | null;
  pinnedCountryId?: string;
  countryLocked?: boolean;
  /** Locale tabs for the title/bio/SEO section, from the doctor's country
   *  enabled locales. Always includes the default locale. */
  locales: { code: string; isDefault: boolean }[];
  defaultLocale: string;
  /** Doctor-level title/bio/SEO language tabs. Shown on create (to bootstrap
   *  the base translation); hidden on edit, where title/bio/SEO are managed
   *  per country by DoctorCountryProfileEditor. Default true. */
  showTranslationTabs?: boolean;
  /** Specialty checkbox grid. Shown on create; hidden on edit. Default true. */
  showSpecialties?: boolean;
};

export function DoctorFields({
  countries,
  specialties,
  initial,
  pinnedCountryId,
  countryLocked,
  locales,
  defaultLocale,
  showTranslationTabs = true,
  showSpecialties = true,
}: Props) {
  const pinId = pinnedCountryId ?? (countryLocked ? initial?.countryId : undefined);
  const pinnedMeta = pinId ? countries.find((c) => c.id === pinId) : undefined;
  const selectedSpecialtyIds = initial?.specialties.map((s) => s.specialtyId) ?? [];
  const baseFallback = {
    title: initial?.title ?? "",
    bio: initial?.bio ?? null,
    seoTitle: initial?.seoTitle ?? null,
    seoDescription: initial?.seoDescription ?? null,
  };

  return (
    <div className="gh-admin-doctor-fields flex flex-col gap-6">
      {/* Section 1 — Admin-only routing + verification fields. These
          affect public URLs + regulator copy, so the doctor never gets
          edit rights from /doctor/profile. */}
      <FormSection
        title="Routing & verification"
        description="Admin-managed only — affects public URLs, the doctor portal scoping, and verification copy."
      >
        {pinId && pinnedMeta ? (
          <div>
            <span className="gh-field-label">Country</span>
            <p className="mt-1 text-[var(--color-text-primary)]">
              {pinnedMeta.name} ({pinnedMeta.code})
            </p>
            <input type="hidden" name="countryId" value={pinId} />
          </div>
        ) : (
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select
              name="countryId"
              className="gh-select min-w-0"
              required
              defaultValue={initial?.countryId ?? ""}
            >
              <option value="">Select country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">URL slug</span>
          <input
            name="slug"
            className="gh-input min-w-0 font-mono text-sm"
            required
            defaultValue={initial?.slug}
            placeholder="e.g. dr-jane-smith"
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            Public URL: <span className="font-mono">/{`{country}`}/{`{lang}`}/doctors/{`{slug}`}</span>. Avoid changing once the
            doctor is live — old URLs will 404.
          </span>
        </label>

        {/* Specialties — checkbox grid (multi-select). Each checked box
            submits its specialty id under the `specialtyIds` form key,
            which `parseDoctorFormData` reads via
            `formData.getAll("specialtyIds")`. Drives the public doctor
            specialty tags + filter. Hidden on edit. */}
        {showSpecialties ? (
        <fieldset className="gh-form-section__span-2 gh-admin-doctor-specialty-fieldset flex flex-col gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--color-text-primary)]">
            Specialties
          </legend>
          <p className="text-xs text-[var(--color-text-muted)]">
            Tick every specialty this doctor is eligible to consult on. The
            list is filtered to the country picked above — switch country
            to load its specialties.
          </p>
          {specialties.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No specialties exist for this country yet.
            </p>
          ) : (
            <div className="gh-admin-doctor-specialty-grid grid gap-2 sm:grid-cols-2">
              {specialties.map((s) => {
                const checked = selectedSpecialtyIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="gh-admin-doctor-specialty-option flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm hover:bg-[var(--color-background-soft)]"
                    style={{ opacity: s.active ? 1 : 0.55 }}
                  >
                    <input
                      type="checkbox"
                      name="specialtyIds"
                      value={s.id}
                      defaultChecked={checked}
                      className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-[var(--color-text-primary)]">
                        {s.name}
                      </span>
                      <span className="block text-portal-thead text-[var(--color-text-muted)]">
                        {s.slug}
                        {!s.active ? " · inactive" : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>
        ) : null}

        <div className="gh-form-section__span-2 gh-admin-doctor-field-grid grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="gh-field-label">Registration number</span>
            <p className="text-xs text-[var(--color-text-muted)] rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)] px-3 py-2">
              Managed in the <strong>Medical registrations</strong> card on the doctor detail page — one entry per country with chamber, number, and verified flag.
            </p>
          </div>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Medical registration URL</span>
            <input
              name="medicalRegistrationUrl"
              className="gh-input min-w-0"
              defaultValue={initial?.medicalRegistrationUrl ?? ""}
              placeholder="https://www.medicalcouncil.ie/..."
            />
            <span className="text-xs text-[var(--color-text-muted)]">Fallback verify link. Per-country links are set in the <strong>Country profile</strong> card (Registration URL) and win over this one.</span>
          </label>
        </div>

        <p className="gh-form-section__span-2 text-xs text-[var(--color-text-muted)]">
          {showTranslationTabs ? (
            <>
              Professional title, bio and SEO are edited per language in the
              <strong> Title, bio &amp; SEO by language</strong> section below.
            </>
          ) : (
            <>
              Professional title, bio and SEO are edited per country in the
              <strong> Country profile</strong> card above.
            </>
          )}
        </p>

        <label className="gh-form-section__span-2 flex cursor-pointer items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="h-4 w-4 rounded border-[var(--color-border)]" />
          <span className="text-sm text-[var(--color-text-primary)]">Active (shown on public API when active)</span>
        </label>
      </FormSection>

      {/* Section 2 — Doctor self-managed. Admin can pre-fill these for
          onboarding, but the doctor owns the values once they accept the
          invite (see /doctor/profile). */}
      <FormSection
        title="Public profile (doctor self-managed)"
        description="Admin can pre-fill these to bootstrap a new doctor, but they own these fields after accepting the invite."
      >
        <label className="flex flex-col gap-2 sm:max-w-md">
          <span className="gh-field-label">Full name</span>
          <input name="fullName" className="gh-input min-w-0" required defaultValue={initial?.fullName} />
          <span className="text-xs text-[var(--color-text-muted)]">
            Same across all languages (proper name).
          </span>
        </label>

        {showTranslationTabs ? (
          <div className="gh-form-section__span-2">
            <DoctorTranslationTabs
              locales={locales}
              defaultLocale={defaultLocale}
              initialTranslations={initial?.translations ?? []}
              baseFallback={baseFallback}
            />
          </div>
        ) : null}

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Qualifications</span>
          <textarea
            name="qualifications"
            className="gh-input min-w-0 min-h-[6rem] resize-y"
            defaultValue={(initial?.qualifications ?? []).join("\n")}
            placeholder={"MB BCh BAO\nMRCPI\nFellowship in Cardiology"}
          />
          <span className="text-xs text-[var(--color-text-muted)]">One qualification per line. Shown on the public profile.</span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">WhatsApp number</span>
          <PhoneField
            name="whatsappNumber"
            defaultValue={initial?.whatsappNumber ?? ""}
            className="flex min-w-0 gap-2 sm:max-w-sm"
          />
        </label>

        {/* Languages — multi-select from the canonical list so the same
            language never shows two ways across the site. Full width
            because the search + chip picker is taller than a plain input. */}
        <div className="gh-form-section__span-2">
          <LanguageMultiSelect initial={initial?.languages ?? []} />
        </div>

        {/* Social media — optional. Empty value clears the link. Surfaced
            below the WhatsApp button on every public DoctorCard. */}
        <div className="gh-form-section__span-2 gh-admin-doctor-social-grid grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Instagram URL</span>
            <input
              name="instagramUrl"
              type="url"
              className="gh-input min-w-0"
              defaultValue={
                (initial as { instagramUrl?: string | null } | undefined)?.instagramUrl ?? ""
              }
              placeholder="https://instagram.com/handle"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Facebook URL</span>
            <input
              name="facebookUrl"
              type="url"
              className="gh-input min-w-0"
              defaultValue={
                (initial as { facebookUrl?: string | null } | undefined)?.facebookUrl ?? ""
              }
              placeholder="https://facebook.com/handle"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">LinkedIn URL</span>
            <input
              name="linkedinUrl"
              type="url"
              className="gh-input min-w-0"
              defaultValue={
                (initial as { linkedinUrl?: string | null } | undefined)?.linkedinUrl ?? ""
              }
              placeholder="https://www.linkedin.com/in/handle"
            />
          </label>
        </div>

        {/* Profile-photo picker lives outside this component:
            - on /admin/doctors/[id]/edit it's mounted in the right-sidebar
              "Profile photo" card and ties back via `form="doctor-edit-form"`;
            - on /admin/doctors/create it's mounted directly inside the form
              below this fields block. */}
      </FormSection>
    </div>
  );
}

import type { AdminCountryDto, AdminDoctorDto, AdminSpecialtyOptionDto } from "@/lib/admin/admin-api";
import { RichTextHtmlField } from "../../_components/rich-text-html-field";

type Props = {
  countries: Pick<AdminCountryDto, "id" | "code" | "name">[];
  specialties: AdminSpecialtyOptionDto[];
  initial?: AdminDoctorDto | null;
  pinnedCountryId?: string;
  countryLocked?: boolean;
};

export function DoctorFields({ countries, specialties, initial, pinnedCountryId, countryLocked }: Props) {
  const pinId = pinnedCountryId ?? (countryLocked ? initial?.countryId : undefined);
  const pinnedMeta = pinId ? countries.find((c) => c.id === pinId) : undefined;
  const selectedSpecialtyIds = initial?.specialties.map((s) => s.specialtyId) ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Section 1 — Admin-only routing + verification fields. These
          affect public URLs + regulator copy, so the doctor never gets
          edit rights from /doctor/profile. */}
      <FormSection
        title="Routing & verification"
        subtitle="Admin-managed only — affects public URLs, the doctor portal scoping, and verification copy."
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

        {/* Categories — checkbox grid (multi-select). Each checked box
            submits its category id under the `specialtyIds` form key,
            which `parseDoctorFormData` reads via
            `formData.getAll("specialtyIds")`. */}
        <fieldset className="flex flex-col gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
          <legend className="px-1 text-sm font-semibold text-[var(--color-text-primary)]">
            Categories
          </legend>
          <p className="text-xs text-[var(--color-text-muted)]">
            Tick every category this doctor is eligible to consult on. The
            list is filtered to the country picked above — switch country
            to load its categories.
          </p>
          {specialties.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No categories exist for this country yet. Create one under{" "}
              <span className="font-mono">/admin/specialties</span>.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {specialties.map((s) => {
                const checked = selectedSpecialtyIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex items-start gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm hover:bg-[var(--color-background-soft)]"
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
                      <span className="block text-[11px] text-[var(--color-text-muted)]">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">IMC registration</span>
            <input
              name="imcRegistration"
              className="gh-input min-w-0"
              defaultValue={initial?.imcRegistration ?? ""}
              placeholder="e.g. IMC 542074"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Medical registration URL</span>
            <input
              name="medicalRegistrationUrl"
              className="gh-input min-w-0"
              defaultValue={initial?.medicalRegistrationUrl ?? ""}
              placeholder="https://www.medicalcouncil.ie/..."
            />
            <span className="text-xs text-[var(--color-text-muted)]">External link to verify registration. Shown on public profile.</span>
          </label>
        </div>

        <div className="grid gap-4">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">SEO title</span>
            <input
              name="seoTitle"
              className="gh-input min-w-0"
              defaultValue={initial?.seoTitle ?? ""}
              maxLength={160}
              placeholder="Optional — defaults to the doctor's full name + title"
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              Renders as the &lt;title&gt; tag on the public doctor profile. Up to ~60 chars renders cleanly in Google.
            </span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">SEO description</span>
            <textarea
              name="seoDescription"
              className="gh-input min-w-0 min-h-[5rem] resize-y"
              defaultValue={initial?.seoDescription ?? ""}
              maxLength={320}
              placeholder="Optional — short summary used in search results and link previews."
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              Used as &lt;meta name=&quot;description&quot;&gt;. ~160 chars renders without truncation.
            </span>
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="h-4 w-4 rounded border-[var(--color-border)]" />
          <span className="text-sm text-[var(--color-text-primary)]">Active (shown on public API when active)</span>
        </label>
      </FormSection>

      {/* Section 2 — Doctor self-managed. Admin can pre-fill these for
          onboarding, but the doctor owns the values once they accept the
          invite (see /doctor/profile). */}
      <FormSection
        title="Public profile (doctor self-managed)"
        subtitle="Admin can pre-fill these to bootstrap a new doctor, but they own these fields after accepting the invite."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Full name</span>
            <input name="fullName" className="gh-input min-w-0" required defaultValue={initial?.fullName} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Professional title</span>
            <input name="title" className="gh-input min-w-0" required defaultValue={initial?.title} placeholder="e.g. Consultant Cardiologist" />
          </label>
        </div>

        <RichTextHtmlField
          name="bio"
          label="Bio"
          initialValue={initial?.bio ?? ""}
          helperText="Supports the same formatting tools used for service detail content."
        />

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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">WhatsApp number</span>
            <input
              name="whatsappNumber"
              className="gh-input min-w-0"
              defaultValue={initial?.whatsappNumber ?? ""}
              placeholder="e.g. +353871234567"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Languages</span>
            <input
              name="languagesCsv"
              className="gh-input min-w-0"
              defaultValue={(initial?.languages ?? []).join(", ")}
              placeholder="English, Portuguese"
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              Comma-separated list used on public doctor cards.
            </span>
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

function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-5">
      <header>
        <h3
          className="m-0 text-[var(--color-text-primary)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          {title}
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{subtitle}</p>
      </header>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

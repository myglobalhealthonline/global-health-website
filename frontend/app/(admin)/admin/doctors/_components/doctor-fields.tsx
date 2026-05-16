import type { AdminCountryDto, AdminDoctorDto, AdminSpecialtyOptionDto } from "@/lib/admin/admin-api";
import { DoctorProfileImageField } from "./doctor-profile-image-field";
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
      <div className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        <p className="font-medium text-[var(--color-text-primary)]">Public directory profiles only</p>
        <p className="mt-1">
          This form edits marketing profiles shown on the public website. There is no doctor login or dashboard here — a separate doctor portal may exist elsewhere.
        </p>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">URL slug</span>
          <input
            name="slug"
            className="gh-input min-w-0 font-mono text-sm"
            required
            defaultValue={initial?.slug}
            placeholder="e.g. dr-jane-smith"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Full name</span>
          <input name="fullName" className="gh-input min-w-0" required defaultValue={initial?.fullName} />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Professional title</span>
        <input name="title" className="gh-input min-w-0" required defaultValue={initial?.title} placeholder="e.g. Consultant Cardiologist" />
      </label>

      {/* Categories the doctor is eligible to take consultations for.
          Checkbox grid (multi-select) instead of a native multiple-select —
          discoverable, mobile-friendly, and admin doesn't have to know
          about Ctrl/Cmd. Each checked box submits its category id under
          the `specialtyIds` form key, which `parseDoctorFormData` reads
          via `formData.getAll("specialtyIds")`. */}
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
          placeholder="MB BCh BAO\nMRCPI\nFellowship in Cardiology"
        />
        <span className="text-xs text-[var(--color-text-muted)]">One qualification per line. Shown on the public profile.</span>
      </label>

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

      <DoctorProfileImageField initialPath={initial?.assets[0]?.path ?? ""} />

      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="h-4 w-4 rounded border-[var(--color-border)]" />
        <span className="text-sm text-[var(--color-text-primary)]">Active (shown on public API when active)</span>
      </label>
    </div>
  );
}

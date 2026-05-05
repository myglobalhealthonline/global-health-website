import type { AdminCountryDto, AdminDoctorDto, AdminSpecialtyOptionDto } from "@/lib/admin/admin-api";

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

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Specialties</span>
        <select
          name="specialtyIds"
          multiple
          className="gh-select min-h-[7rem] min-w-0"
          defaultValue={selectedSpecialtyIds}
        >
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.slug}){!s.active ? " — inactive" : ""}
            </option>
          ))}
        </select>
        <span className="text-xs text-[var(--color-text-muted)]">Hold Ctrl/Cmd to select multiple. Must match the chosen country.</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Bio</span>
        <textarea
          name="bio"
          rows={6}
          className="gh-input min-h-[8rem] min-w-0 resize-y"
          defaultValue={initial?.bio ?? ""}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Profile image (https URL or site path)</span>
        <input
          name="profileImagePath"
          className="gh-input min-w-0 font-mono text-sm"
          defaultValue={initial?.assets[0]?.path ?? ""}
          placeholder="https://… or /media/…"
        />
        <span className="text-xs text-[var(--color-text-muted)]">
          Saved as an IMAGE asset for this doctor. On edit, leave blank and save to remove the image.
        </span>
      </label>

      <p className="text-xs text-[var(--color-text-muted)]">
        Languages and structured qualifications are not on the Doctor model yet — add via a future migration if needed.
      </p>

      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="h-4 w-4 rounded border-[var(--color-border)]" />
        <span className="text-sm text-[var(--color-text-primary)]">Active (shown on public API when active)</span>
      </label>
    </div>
  );
}

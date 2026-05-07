import type { AdminCountryDto, AdminServiceDto, AdminSpecialtyOptionDto } from "@/lib/admin/admin-api";
import { ManagedImageField } from "../../_components/managed-image-field";
import { RichTextHtmlField } from "../../_components/rich-text-html-field";

type Props = {
  countries: Pick<AdminCountryDto, "id" | "code" | "name">[];
  specialties: AdminSpecialtyOptionDto[];
  initial?: AdminServiceDto | null;
  pinnedCountryId?: string;
  countryLocked?: boolean;
};

export function ServiceFields({ countries, specialties, initial, pinnedCountryId, countryLocked }: Props) {
  const pinId = pinnedCountryId ?? (countryLocked ? initial?.countryId : undefined);
  const pinnedMeta = pinId ? countries.find((c) => c.id === pinId) : undefined;

  return (
    <div className="flex flex-col gap-6">
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
          <span className="gh-field-label">Slug</span>
          <input
            name="slug"
            className="gh-input min-w-0 font-mono text-sm"
            required
            defaultValue={initial?.slug}
            placeholder="e.g. cardiology-consultation"
          />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="gh-field-label">Title (name)</span>
          <input name="name" className="gh-input min-w-0" required defaultValue={initial?.name} />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Specialty / category</span>
        <select name="specialtyId" className="gh-select min-w-0" defaultValue={initial?.specialtyId ?? ""}>
          <option value="">None</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.slug}){!s.active ? " - inactive" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Summary</span>
        <textarea
          name="summary"
          rows={4}
          className="gh-input min-h-[6rem] min-w-0 resize-y"
          defaultValue={initial?.summary ?? ""}
        />
      </label>

      <ManagedImageField
        name="imagePath"
        label="Hero image"
        initialPath={initial?.assets[0]?.path ?? ""}
        helperText="Shown on the public specialist detail page."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Hero title</span>
          <input
            name="heroTitle"
            className="gh-input min-w-0"
            defaultValue={initial?.heroTitle ?? ""}
            placeholder="Optional heading override"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">CTA label</span>
          <input
            name="ctaLabel"
            className="gh-input min-w-0"
            defaultValue={initial?.ctaLabel ?? ""}
            placeholder="Book Online"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Hero description</span>
        <textarea
          name="heroDescription"
          rows={3}
          className="gh-input min-h-[5rem] min-w-0 resize-y"
          defaultValue={initial?.heroDescription ?? ""}
        />
      </label>

      <RichTextHtmlField
        name="detailBody"
        label="Detail body"
        initialValue={initial?.detailBody ?? ""}
        helperText="Supports the same Word-style formatting used for doctor bios."
      />

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Legacy path</span>
        <input
          name="legacyPath"
          className="gh-input min-w-0 font-mono text-sm"
          defaultValue={initial?.legacyPath ?? ""}
          placeholder="/path-if-used"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Duration (minutes)</span>
          <input
            type="number"
            name="durationMinutes"
            min={1}
            step={1}
            className="gh-input min-w-0"
            defaultValue={initial?.durationMinutes ?? ""}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Base price (cents)</span>
          <input
            type="number"
            name="basePriceCents"
            min={0}
            step={1}
            className="gh-input min-w-0"
            defaultValue={initial?.basePriceCents ?? ""}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Currency code</span>
          <input
            name="currencyCode"
            className="gh-input min-w-0 uppercase"
            placeholder="EUR"
            maxLength={8}
            defaultValue={initial?.currencyCode ?? ""}
          />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="h-4 w-4 rounded border-[var(--color-border)]"
        />
        Service active
      </label>
    </div>
  );
}

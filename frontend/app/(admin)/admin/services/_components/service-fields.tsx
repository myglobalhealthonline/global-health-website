import type { AdminCountryDto, AdminServiceDto, AdminServiceKind, AdminSpecialtyOptionDto } from "@/lib/admin/admin-api";
import { ManagedImageField } from "../../_components/managed-image-field";
import { RichTextHtmlField } from "../../_components/rich-text-html-field";
import { SERVICE_KIND_META } from "@/lib/admin/service-kind";

type Props = {
  countries: Pick<AdminCountryDto, "id" | "code" | "name">[];
  specialties: AdminSpecialtyOptionDto[];
  kind: AdminServiceKind;
  initial?: AdminServiceDto | null;
  pinnedCountryId?: string;
  countryLocked?: boolean;
};

export function ServiceFields({ countries, specialties, kind, initial, pinnedCountryId, countryLocked }: Props) {
  const pinId = pinnedCountryId ?? (countryLocked ? initial?.countryId : undefined);
  const pinnedMeta = pinId ? countries.find((c) => c.id === pinId) : undefined;
  const meta = SERVICE_KIND_META[kind];
  const usesSpecialty = kind === "SPECIALIST";

  return (
    <div className="flex flex-col gap-6">
      <input type="hidden" name="kind" value={kind} />

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

      <div className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        This record will publish under <span className="font-semibold text-[var(--color-text-primary)]">{meta.label}</span>.
      </div>

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

      {usesSpecialty ? (
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Category</span>
          <select name="specialtyId" className="gh-select min-w-0" defaultValue={initial?.specialtyId ?? ""} required>
            <option value="">Select category</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.slug}){!s.active ? " - inactive" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="specialtyId" value="" />
      )}

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Summary</span>
        <textarea
          name="summary"
          rows={4}
          className="gh-input min-h-[6rem] min-w-0 resize-y"
          defaultValue={initial?.summary ?? ""}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Sort order</span>
          <input
            type="number"
            name="sortOrder"
            min={0}
            step={1}
            className="gh-input min-w-0"
            defaultValue={initial?.sortOrder ?? 0}
          />
        </label>
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
          <span className="gh-field-label">Starting price (cents)</span>
          <input
            type="number"
            name="basePriceCents"
            min={0}
            step={1}
            className="gh-input min-w-0"
            defaultValue={initial?.basePriceCents ?? ""}
          />
        </label>
      </div>

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

      <ManagedImageField
        name="imagePath"
        label="Hero image"
        initialPath={initial?.assets[0]?.path ?? ""}
        helperText={`Shown on the public ${meta.singularLabel.toLowerCase()} card and detail page.`}
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

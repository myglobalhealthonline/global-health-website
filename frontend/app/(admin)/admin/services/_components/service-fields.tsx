import type { AdminCountryDto, AdminServiceDto, AdminServiceKind, AdminSpecialtyOptionDto } from "@/lib/admin/admin-api";
import { ManagedImageField } from "../../_components/managed-image-field";
import { formatServicePriceInput } from "@/lib/admin/service-form-parse";
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
          <span className="gh-field-label">Starting price</span>
          <input
            type="text"
            inputMode="decimal"
            name="basePrice"
            className="gh-input min-w-0"
            defaultValue={formatServicePriceInput(initial?.basePriceCents)}
            placeholder="45.00"
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

      {/* The hero / detail-body / legacy-path columns exist on the DB
          but no public surface reads them today (public ServicesGrid only
          uses name + summary + slug + price). Hidden inputs preserve the
          stored values across saves until either:
          - a service-detail page ships (and these fields are useful), or
          - the columns get dropped from the schema.
          Keep them out of the visible form to reduce clutter. */}
      <input type="hidden" name="heroTitle" defaultValue={initial?.heroTitle ?? ""} />
      <input type="hidden" name="ctaLabel" defaultValue={initial?.ctaLabel ?? ""} />
      <input
        type="hidden"
        name="heroDescription"
        defaultValue={initial?.heroDescription ?? ""}
      />
      <input type="hidden" name="detailBody" defaultValue={initial?.detailBody ?? ""} />
      <input type="hidden" name="legacyPath" defaultValue={initial?.legacyPath ?? ""} />

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

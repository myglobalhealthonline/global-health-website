import type { AdminAssetDto, AdminAssetKind, AdminCountryDto } from "@/lib/admin/admin-api";
import { AssetPathWithUpload } from "./asset-path-with-upload";
import { FormSection } from "@/components/FormSection";

type DoctorOption = { id: string; fullName: string; slug: string };

type Props = {
  countries: Pick<AdminCountryDto, "id" | "code" | "name">[];
  doctorOptions: DoctorOption[];
  initial?: AdminAssetDto | null;
};

const KIND_OPTIONS: { value: AdminAssetKind; label: string }[] = [
  { value: "IMAGE", label: "IMAGE" },
  { value: "ICON", label: "ICON" },
  { value: "LOGO", label: "LOGO" },
  { value: "BADGE", label: "BADGE" },
  { value: "SOCIAL", label: "SOCIAL" },
];

export function AssetFields({ countries, doctorOptions, initial }: Props) {
  return (
    <FormSection
      title="Asset details"
      description="Asset rows store a path or URL. When the API is connected to Railway Bucket (S3), use Upload image to bucket to store the file and fill a stable https:// URL served via GET /api/media/…. You can still paste local paths such as /images/…."
    >
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Country (optional)</span>
        <select name="countryId" className="gh-select min-w-0" defaultValue={initial?.countryId ?? ""}>
          <option value="">None (global)</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Linked doctor profile (optional)</span>
        <select name="doctorId" className="gh-select min-w-0" defaultValue={initial?.doctorId ?? ""}>
          <option value="">None</option>
          {doctorOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName} ({d.slug})
            </option>
          ))}
        </select>
        <span className="text-xs text-[var(--color-text-muted)]">
          Options load for the selected country on new/edit flows. Pick country first where relevant.
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Kind</span>
        <select
          name="kind"
          className="gh-select min-w-0"
          required
          defaultValue={initial?.kind ?? "IMAGE"}
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Key (unique per kind)</span>
        <input
          name="key"
          className="gh-input min-w-0 font-mono text-sm"
          required
          defaultValue={initial?.key}
          placeholder="e.g. homepage-hero"
        />
      </label>

      <div className="gh-form-section__span-2">
        <AssetPathWithUpload initialPath={initial?.path} />
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Alt text</span>
        <input
          name="altText"
          className="gh-input min-w-0"
          defaultValue={initial?.altText ?? ""}
          placeholder="Required for IMAGE, ICON, LOGO, BADGE"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Image title</span>
        <input
          name="title"
          className="gh-input min-w-0"
          defaultValue={initial?.title ?? ""}
          placeholder="Short image title for SEO"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Caption</span>
        <input
          name="caption"
          className="gh-input min-w-0"
          defaultValue={initial?.caption ?? ""}
          placeholder="Optional visible/public caption"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Image description</span>
        <textarea
          name="description"
          rows={3}
          className="gh-input min-w-0 resize-y"
          defaultValue={initial?.description ?? ""}
          placeholder="Optional longer description for accessibility and media inventory"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Usage / location note</span>
        <textarea
          name="usageNote"
          rows={3}
          className="gh-input min-w-0 resize-y"
          defaultValue={initial?.usageNote ?? ""}
          placeholder="e.g. Ireland home hero — internal inventory note"
        />
      </label>

      <label className="gh-form-section__span-2 gh-admin-asset-active-row">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="h-4 w-4 rounded border-[var(--color-border)]"
        />
        <span className="text-sm text-[var(--color-text-primary)]">Active (shown on public assets API when active)</span>
      </label>
    </FormSection>
  );
}

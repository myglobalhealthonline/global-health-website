import type { AdminAssetDto, AdminAssetKind, AdminCountryDto } from "@/lib/admin/admin-api";
import { AssetPathWithUpload } from "./asset-path-with-upload";

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
    <div className="flex flex-col gap-6">
      <div className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        <p className="font-medium text-[var(--color-text-primary)]">Paths & uploads</p>
        <p className="mt-1">
          Asset rows store a path or URL. When the API is connected to Railway Bucket (S3), use{" "}
          <span className="font-medium text-[var(--color-text-primary)]">Upload image to bucket</span> to store the file
          and fill a stable <code className="font-mono text-xs">https://</code> URL served via{" "}
          <code className="font-mono text-xs">GET /api/media/…</code>. You can still paste local paths such as{" "}
          <code className="font-mono text-xs">/images/…</code>.
        </p>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <AssetPathWithUpload initialPath={initial?.path} />

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
        <span className="gh-field-label">Usage / location note</span>
        <textarea
          name="usageNote"
          rows={3}
          className="gh-input min-w-0 resize-y"
          defaultValue={initial?.usageNote ?? ""}
          placeholder="e.g. Ireland home hero — internal inventory note"
        />
      </label>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="h-4 w-4 rounded border-[var(--color-border)]"
        />
        <span className="text-sm text-[var(--color-text-primary)]">Active (shown on public assets API when active)</span>
      </label>
    </div>
  );
}

import type { AdminCountryDto, AdminHealthTestDto } from "@/lib/admin/admin-api";
import {
  formatHealthTestExtraSections,
  formatHealthTestLines,
  formatHealthTestPriceInput,
} from "@/lib/admin/health-test-form-parse";
import { ManagedImageField } from "../../_components/managed-image-field";

type Props = {
  countries: Pick<AdminCountryDto, "id" | "code" | "name">[];
  initial?: AdminHealthTestDto | null;
  pinnedCountryId?: string;
  countryLocked?: boolean;
};

export function HealthTestFields({ countries, initial, pinnedCountryId, countryLocked }: Props) {
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
          <select name="countryId" className="gh-select min-w-0" required defaultValue={initial?.countryId ?? ""}>
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
          <input name="slug" className="gh-input min-w-0 font-mono text-sm" required defaultValue={initial?.slug ?? ""} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Title</span>
          <input name="title" className="gh-input min-w-0" required defaultValue={initial?.title ?? ""} />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Short description</span>
        <textarea
          name="shortDescription"
          rows={4}
          className="gh-input min-h-[6rem] min-w-0 resize-y"
          defaultValue={initial?.shortDescription ?? ""}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-4">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Price</span>
          <input type="text" inputMode="decimal" name="price" className="gh-input min-w-0" defaultValue={formatHealthTestPriceInput(initial?.priceCents)} placeholder="84.00" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Currency</span>
          <input name="currencyCode" className="gh-input min-w-0 uppercase" defaultValue={initial?.currencyCode ?? "EUR"} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Sample type</span>
          <input name="sampleType" className="gh-input min-w-0" defaultValue={initial?.sampleType ?? ""} placeholder="Finger Prick" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Results timeline</span>
          <input name="resultsTimeline" className="gh-input min-w-0" defaultValue={initial?.resultsTimeline ?? ""} placeholder="Results in 2–3 working days after arrival in lab" />
        </label>
      </div>

      <ManagedImageField
        name="productImagePath"
        label="Product image"
        initialPath={initial?.productImagePath ?? ""}
        helperText="Main image shown on the health-test card and detail page."
      />

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Gallery image paths</span>
        <textarea
          name="galleryImagePaths"
          rows={4}
          className="gh-input min-h-[6rem] min-w-0 resize-y font-mono text-sm"
          defaultValue={formatHealthTestLines(initial?.galleryImagePaths)}
          placeholder="/api/media/... one per line"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Hero button label</span>
          <input name="heroButtonLabel" className="gh-input min-w-0" defaultValue={initial?.heroButtonLabel ?? ""} placeholder="Buy Now" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Sort order</span>
          <input type="number" min={0} step={1} name="sortOrder" className="gh-input min-w-0" defaultValue={initial?.sortOrder ?? 0} />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Detail intro</span>
        <textarea
          name="detailIntro"
          rows={6}
          className="gh-input min-h-[10rem] min-w-0 resize-y"
          defaultValue={initial?.detailIntro ?? ""}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">What this test covers</span>
        <textarea
          name="whatThisTestCovers"
          rows={8}
          className="gh-input min-h-[12rem] min-w-0 resize-y"
          defaultValue={formatHealthTestLines(initial?.whatThisTestCovers)}
          placeholder="One bullet per line"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Why get tested</span>
        <textarea
          name="whyGetTested"
          rows={8}
          className="gh-input min-h-[12rem] min-w-0 resize-y"
          defaultValue={formatHealthTestLines(initial?.whyGetTested)}
          placeholder="One reason per line"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Extra sections</span>
        <textarea
          name="extraSections"
          rows={10}
          className="gh-input min-h-[14rem] min-w-0 resize-y"
          defaultValue={formatHealthTestExtraSections(initial?.extraSections)}
          placeholder={"Section heading\nSection body\n\nAnother heading\nAnother body"}
        />
        <span className="text-xs text-[var(--color-text-muted)]">Separate sections with a blank line. First line is the heading.</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">SEO title</span>
          <input name="seoTitle" className="gh-input min-w-0" defaultValue={initial?.seoTitle ?? ""} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Legacy path</span>
          <input name="legacyPath" className="gh-input min-w-0 font-mono text-sm" defaultValue={initial?.legacyPath ?? ""} placeholder="/home-health-tests/slug" />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">SEO description</span>
        <textarea
          name="seoDescription"
          rows={3}
          className="gh-input min-h-[5rem] min-w-0 resize-y"
          defaultValue={initial?.seoDescription ?? ""}
        />
      </label>

      <label className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
        <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} className="h-4 w-4 rounded border-[var(--color-border)]" />
        Health test active
      </label>
    </div>
  );
}

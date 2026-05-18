import type { AdminCountryDto, AdminHealthTestDto } from "@/lib/admin/admin-api";
import {
  formatHealthTestExtraSections,
  formatHealthTestLines,
  formatHealthTestPriceInput,
} from "@/lib/admin/health-test-form-parse";
import { ManagedImageField } from "../../_components/managed-image-field";

function formatStockInput(stock: number | null | undefined): string {
  if (stock === null || stock === undefined) return "";
  return String(stock);
}

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
        helperText="Main image shown on the health-test card. Required."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Stock</span>
          <input
            type="number"
            min={0}
            step={1}
            name="stock"
            className="gh-input min-w-0"
            defaultValue={formatStockInput(initial?.stock)}
            placeholder="Leave blank for unlimited"
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            Blank = unlimited. 0 = sold out. 1–5 surfaces an &quot;Only N left&quot; badge on the public card.
          </span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Sort order</span>
          <input
            type="number"
            min={0}
            step={1}
            name="sortOrder"
            className="gh-input min-w-0"
            defaultValue={initial?.sortOrder ?? 0}
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            Lower numbers appear first in the listing.
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">SEO title</span>
          <input name="seoTitle" className="gh-input min-w-0" defaultValue={initial?.seoTitle ?? ""} />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">SEO description</span>
          <input name="seoDescription" className="gh-input min-w-0" defaultValue={initial?.seoDescription ?? ""} />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm text-[var(--color-text-primary)]">
        <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} className="h-4 w-4 rounded border-[var(--color-border)]" />
        Health test active
      </label>

      {/* Detail-page-only fields. The public /tests route is a listing
          (card grid) with no per-test detail page, so these fields aren't
          surfaced anywhere visitors can see. Kept as hidden inputs to
          preserve whatever was previously saved across edits — that way
          we don't blow away historical data if we later ship a detail
          page. Drop the hidden inputs (or remove the columns from
          schema.prisma) once it's clear the detail surface is dead for
          good. */}
      <input
        type="hidden"
        name="heroButtonLabel"
        defaultValue={initial?.heroButtonLabel ?? ""}
      />
      <input
        type="hidden"
        name="galleryImagePaths"
        defaultValue={formatHealthTestLines(initial?.galleryImagePaths)}
      />
      <input
        type="hidden"
        name="detailIntro"
        defaultValue={initial?.detailIntro ?? ""}
      />
      <input
        type="hidden"
        name="whatThisTestCovers"
        defaultValue={formatHealthTestLines(initial?.whatThisTestCovers)}
      />
      <input
        type="hidden"
        name="whyGetTested"
        defaultValue={formatHealthTestLines(initial?.whyGetTested)}
      />
      <input
        type="hidden"
        name="extraSections"
        defaultValue={formatHealthTestExtraSections(initial?.extraSections)}
      />
      <input
        type="hidden"
        name="legacyPath"
        defaultValue={initial?.legacyPath ?? ""}
      />
    </div>
  );
}

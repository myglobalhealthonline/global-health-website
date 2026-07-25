import type { AdminCountryDto, AdminHealthTestDto } from "@/lib/admin/admin-api";
import { formatHealthTestPriceInput } from "@/lib/admin/health-test-form-parse";
import { ManagedImageField } from "../../_components/managed-image-field";
import { MultiImageField } from "../../_components/multi-image-field";
import { HealthTestTranslationTabs } from "./health-test-translation-tabs";
import { FormSection } from "@/components/FormSection";

function formatStockInput(stock: number | null | undefined): string {
  if (stock === null || stock === undefined) return "";
  return String(stock);
}

function formatShippingInput(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || cents === 0) return "";
  return (cents / 100).toFixed(2);
}

type Props = {
  countries: Pick<AdminCountryDto, "id" | "code" | "name">[];
  initial?: AdminHealthTestDto | null;
  pinnedCountryId?: string;
  countryLocked?: boolean;
  locales: { code: string; isDefault: boolean }[];
  defaultLocale: string;
};

export function HealthTestFields({
  countries,
  initial,
  pinnedCountryId,
  countryLocked,
  locales,
  defaultLocale,
}: Props) {
  const pinId = pinnedCountryId ?? (countryLocked ? initial?.countryId : undefined);
  const pinnedMeta = pinId ? countries.find((c) => c.id === pinId) : undefined;
  const baseFallback = {
    title: initial?.title ?? "",
    shortDescription: initial?.shortDescription ?? null,
    sampleType: initial?.sampleType ?? null,
    resultsTimeline: initial?.resultsTimeline ?? null,
    seoTitle: initial?.seoTitle ?? null,
    seoDescription: initial?.seoDescription ?? null,
  };

  return (
    <div className="gh-admin-health-fields flex flex-col gap-5">
    <FormSection title="Health test">
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

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Slug</span>
        <input name="slug" className="gh-input min-w-0 font-mono text-sm" required defaultValue={initial?.slug ?? ""} />
      </label>

      <div className="gh-form-section__span-2">
        <HealthTestTranslationTabs
          locales={locales}
          defaultLocale={defaultLocale}
          initialTranslations={initial?.translations ?? []}
          baseFallback={baseFallback}
        />
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Price</span>
        <input type="text" inputMode="decimal" name="price" className="gh-input min-w-0" defaultValue={formatHealthTestPriceInput(initial?.priceCents)} placeholder="0.00" pattern="^\d+(\.\d{1,2})?$" title="Enter a valid amount like 84 or 84.00" />
      </label>
      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Currency</span>
        <input name="currencyCode" className="gh-input min-w-0 uppercase" defaultValue={initial?.currencyCode ?? "EUR"} />
      </label>

      <div className="gh-form-section__span-2">
        <ManagedImageField
          name="productImagePath"
          label="Product image"
          initialPath={initial?.productImagePath ?? ""}
          helperText="Main image shown on the health-test card. Required."
        />
      </div>

      <div className="gh-form-section__span-2">
        <MultiImageField
          name="galleryImagePaths"
          label="Gallery images"
          initialPaths={initial?.galleryImagePaths ?? []}
          helperText="Optional additional images. Up to 12. Not yet rendered on the public card — saved for a future per-test detail page."
          max={12}
        />
      </div>
    </FormSection>

    <FormSection title="Inventory & ordering">
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
        <span className="gh-field-label">Shipping price</span>
        <input
          type="text"
          inputMode="decimal"
          name="shipping"
          className="gh-input min-w-0"
          defaultValue={formatShippingInput(initial?.shippingCents)}
          placeholder="0.00"
          pattern="^\d+(\.\d{1,2})?$"
          title="Enter a valid amount like 5 or 5.00"
        />
        <span className="text-xs text-[var(--color-text-muted)]">
          Charged per kit at checkout. Leave blank for free shipping.
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

      <label className="gh-form-section__span-2 gh-admin-health-active-row">
        <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} className="h-4 w-4 rounded border-[var(--color-border)]" />
        Health test active
      </label>

      {/* Detail-page-only fields (heroButtonLabel, detailIntro,
          whatThisTestCovers, whyGetTested, extraSections, legacyPath)
          are still omitted from the form — no per-test detail page
          renders them yet. PATCH is partial so the underlying columns
          stay put on edit. CREATE picks up the schema defaults. */}
    </FormSection>
    </div>
  );
}

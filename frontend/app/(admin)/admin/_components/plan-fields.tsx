import type { AdminPlanDetail } from "@/lib/admin/plans-api";

type CountryOpt = { id: string; code: string; name: string };

type Props = {
  countries: CountryOpt[];
  initial?: AdminPlanDetail | null;
  /** When set, the country is fixed (create-with-country or edit). */
  pinnedCountryId?: string;
};

/**
 * Shared plan create/edit fields. Pure presentational server component — the
 * parent form's server action reads these via parsePlanForm. Price is shown in
 * major currency units; the action converts to cents.
 */
export function PlanFields({ countries, initial, pinnedCountryId }: Props) {
  const pinId = pinnedCountryId ?? initial?.countryId;
  const pinned = pinId ? countries.find((c) => c.id === pinId) : undefined;
  const priceMajor = initial ? (initial.monthlyPriceCents / 100).toFixed(2) : "";

  return (
    <div className="flex flex-col gap-6">
      {pinId && pinned ? (
        <div>
          <span className="gh-field-label">Country</span>
          <p className="mt-1 text-[var(--color-text-primary)]">
            {pinned.name} ({pinned.code.toUpperCase()})
          </p>
          <input type="hidden" name="countryId" value={pinId} />
        </div>
      ) : (
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Country</span>
          <select name="countryId" className="gh-select min-w-0" required defaultValue="">
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code.toUpperCase()})
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
            placeholder="e.g. essential-care"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Plan name</span>
          <input name="name" className="gh-input min-w-0" required defaultValue={initial?.name} />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Short description</span>
        <input
          name="shortDescription"
          className="gh-input min-w-0"
          defaultValue={initial?.shortDescription ?? ""}
          placeholder="One-line card summary"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Long description</span>
        <textarea
          name="longDescription"
          className="gh-textarea min-w-0"
          rows={3}
          defaultValue={initial?.longDescription ?? ""}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Notes &amp; terms</span>
        <textarea
          name="notesTerms"
          className="gh-textarea min-w-0"
          rows={2}
          defaultValue={initial?.notesTerms ?? ""}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Monthly price</span>
          <input
            name="monthlyPrice"
            className="gh-input min-w-0"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={priceMajor}
            placeholder="20.00"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Currency</span>
          <input
            name="currencyCode"
            className="gh-input min-w-0 font-mono uppercase"
            required
            maxLength={8}
            defaultValue={initial?.currencyCode ?? "EUR"}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Display order</span>
          <input
            name="displayOrder"
            className="gh-input min-w-0"
            type="number"
            min="0"
            defaultValue={initial?.displayOrder ?? 0}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">GP / general consultation credits / month</span>
          <input
            name="monthlyConsultationCredits"
            className="gh-input min-w-0"
            type="number"
            min="0"
            defaultValue={initial?.monthlyConsultationCredits ?? 0}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Wellness credits / month (Premium only)</span>
          <input
            name="wellnessCreditsPerMonth"
            className="gh-input min-w-0"
            type="number"
            min="0"
            defaultValue={initial?.wellnessCreditsPerMonth ?? 0}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">VAT mode</span>
          <select name="vatMode" className="gh-select min-w-0" defaultValue={initial?.vatMode ?? "EXEMPT"}>
            <option value="EXEMPT">Exempt (medical)</option>
            <option value="STANDARD">Standard</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">VAT rate % (when standard)</span>
          <input
            name="vatRatePct"
            className="gh-input min-w-0"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={initial?.vatRatePct ?? ""}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Badge label (optional)</span>
        <input
          name="badgeLabel"
          className="gh-input min-w-0"
          defaultValue={initial?.badgeLabel ?? ""}
          placeholder="e.g. Most popular"
        />
      </label>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
          <input type="checkbox" name="isFeatured" className="size-4" defaultChecked={initial?.isFeatured ?? false} />
          Featured / recommended
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)]">
          <input type="checkbox" name="familyEnabled" className="size-4" defaultChecked={initial?.familyEnabled ?? false} />
          Family enabled (Wave 5 — keep off)
        </label>
        {initial ? (
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
            <input type="checkbox" name="isActive" className="size-4" defaultChecked={initial.isActive} />
            Active
          </label>
        ) : null}
      </div>
    </div>
  );
}

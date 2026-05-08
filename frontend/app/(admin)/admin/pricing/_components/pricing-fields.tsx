import type { AdminCountryDto, AdminCurrencyDto, AdminPricingPlanDto } from "@/lib/admin/admin-api";
import { formatPricingPriceInput } from "@/lib/admin/pricing-form-parse";

type Props = {
  countries: Pick<AdminCountryDto, "id" | "code" | "name">[];
  currencies: AdminCurrencyDto[];
  initial?: AdminPricingPlanDto | null;
  pinnedCountryId?: string;
  countryLocked?: boolean;
};

export function PricingFields({ countries, currencies, initial, pinnedCountryId, countryLocked }: Props) {
  const pinId = pinnedCountryId ?? (countryLocked ? initial?.countryId : undefined);
  const pinnedMeta = pinId ? countries.find((c) => c.id === pinId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        <p className="font-medium text-[var(--color-text-primary)]">Displayed pricing only</p>
        <p className="mt-1">
          This manages marketing pricing rows shown on the site. Patient payments, card capture, Stripe, and checkout sessions are not implemented yet.
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
          <span className="gh-field-label">Slug</span>
          <input
            name="slug"
            className="gh-input min-w-0 font-mono text-sm"
            required
            defaultValue={initial?.slug}
            placeholder="e.g. annual-plan"
          />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="gh-field-label">Plan name</span>
          <input name="name" className="gh-input min-w-0" required defaultValue={initial?.name} />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="gh-field-label">Description</span>
        <textarea
          name="description"
          rows={4}
          className="gh-input min-h-[6rem] min-w-0 resize-y"
          defaultValue={initial?.description ?? ""}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Price</span>
          <input
            name="price"
            type="text"
            inputMode="decimal"
            min={0}
            className="gh-input min-w-0 font-mono text-sm"
            required
            defaultValue={formatPricingPriceInput(initial?.priceCents)}
            placeholder="45.00"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Currency</span>
          <select
            name="currencyCode"
            className="gh-select min-w-0 font-mono text-sm"
            required
            defaultValue={initial?.currencyCode ?? ""}
          >
            <option value="">Select...</option>
            {currencies.map((cur) => (
              <option key={cur.id} value={cur.code}>
                {cur.code} ({cur.symbol})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Billing interval</span>
          <input
            name="interval"
            className="gh-input min-w-0"
            required
            defaultValue={initial?.interval ?? ""}
            placeholder="month, year, once..."
          />
          <span className="text-xs text-[var(--color-text-muted)]">Stored as free text (see schema).</span>
        </label>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        Enter the public plan price in normal currency format such as `45` or `45.00`.
      </p>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="h-4 w-4 rounded border-[var(--color-border)]"
        />
        <span className="text-sm text-[var(--color-text-primary)]">Active (shown on public pricing API when active)</span>
      </label>
    </div>
  );
}

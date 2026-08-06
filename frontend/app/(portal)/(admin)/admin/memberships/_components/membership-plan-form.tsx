import { FormSection } from "@/components/FormSection";
import type { MembershipPlanDetail } from "@/lib/admin/memberships-api";

type CountryOpt = { id: string; code: string; name: string };

/** Small muted helper line under a field. */
function Help({ children }: { children: React.ReactNode }) {
  return <span className="text-xs leading-snug text-[var(--color-text-muted)]">{children}</span>;
}

/**
 * Shared create/edit fields for a membership programme. Pure presentational
 * server component — the parent form's server action reads these through
 * `parseMembershipPlanForm`.
 *
 * The country is fixed: a plan belongs to exactly one country (decision 9), so
 * on create it is carried in from the picker and on edit it is read-only.
 *
 * Payer fields are metadata only (§15). Nothing here bills anyone — the copy
 * says so, because "amount" next to an email address invites the assumption
 * that a charge happens.
 */
export function MembershipPlanFields({
  countries,
  initial,
  pinnedCountryId,
}: {
  countries: CountryOpt[];
  initial?: MembershipPlanDetail | null;
  pinnedCountryId?: string;
}) {
  const pinId = pinnedCountryId ?? initial?.countryId;
  const pinned = pinId ? countries.find((c) => c.id === pinId) : undefined;
  const payerAmountMajor =
    initial?.payerAmountCents != null ? (initial.payerAmountCents / 100).toFixed(2) : "";

  return (
    <div className="flex flex-col gap-5">
      <FormSection title="Programme">
        {pinId && pinned ? (
          <div>
            <span className="gh-field-label">Country</span>
            <p className="mt-1 text-[var(--color-text-primary)]">
              {pinned.name} ({pinned.code.toUpperCase()})
            </p>
            <Help>A programme belongs to one country and can&apos;t be moved later.</Help>
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

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Name</span>
          <input
            name="name"
            className="gh-input"
            required
            maxLength={200}
            defaultValue={initial?.name ?? ""}
            placeholder="MEMS Ireland"
          />
          <Help>Internal label. What members see comes from the translations.</Help>
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Slug</span>
          <input
            name="slug"
            className="gh-input font-mono"
            required
            minLength={2}
            maxLength={60}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={initial?.slug ?? ""}
            placeholder="mems-ireland"
          />
          <Help>Lowercase letters, numbers and hyphens. Unique within the country.</Help>
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Internal notes</span>
          <textarea
            name="internalNotes"
            className="gh-input min-h-24"
            maxLength={5000}
            defaultValue={initial?.internalNotes ?? ""}
            placeholder="Contract reference, contact at the partner, renewal date…"
          />
          <Help>Never shown to members.</Help>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isActive"
            className="gh-checkbox"
            defaultChecked={initial ? initial.isActive : true}
          />
          <span className="gh-field-label">Active</span>
        </label>
      </FormSection>

      <FormSection
        title="Payer (optional)"
        description="Who pays for this programme, for your records only. Nothing here is charged, invoiced or shown to a member."
      >
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Payer name</span>
          <input
            name="payerName"
            className="gh-input"
            maxLength={200}
            defaultValue={initial?.payerName ?? ""}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Payer email</span>
          <input
            name="payerEmail"
            type="email"
            className="gh-input"
            maxLength={320}
            defaultValue={initial?.payerEmail ?? ""}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Payer phone</span>
          <input
            name="payerPhone"
            className="gh-input"
            maxLength={60}
            defaultValue={initial?.payerPhone ?? ""}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Agreed amount</span>
          <input
            name="payerAmountMajor"
            className="gh-input"
            inputMode="decimal"
            defaultValue={payerAmountMajor}
            placeholder="0.00"
          />
          <Help>Recorded for reference. No payment is ever taken from this.</Help>
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Currency</span>
          <input
            name="payerCurrency"
            className="gh-input uppercase"
            maxLength={8}
            defaultValue={initial?.payerCurrency ?? ""}
            placeholder="EUR"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Payer notes</span>
          <textarea
            name="payerNotes"
            className="gh-input min-h-20"
            maxLength={5000}
            defaultValue={initial?.payerNotes ?? ""}
          />
        </label>
      </FormSection>
    </div>
  );
}

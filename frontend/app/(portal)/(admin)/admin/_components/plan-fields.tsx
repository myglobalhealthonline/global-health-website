import type { AdminPlanDetail, PlanType } from "@/lib/admin/plans-api";
import { BenefitsUnlockField } from "./benefits-unlock-field";
import { FormSection } from "@/components/FormSection";

type CountryOpt = { id: string; code: string; name: string };

type Props = {
  countries: CountryOpt[];
  initial?: AdminPlanDetail | null;
  /** When set, the country is fixed (create-with-country or edit). */
  pinnedCountryId?: string;
  /** Plan tier — passed on create (chosen first), read from `initial` on edit. */
  planType?: PlanType;
};

/** Single source of truth for tier display names across the admin surfaces. */
export const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  ESSENTIAL: "Essential Care",
  COMPREHENSIVE: "Comprehensive Care",
  PREMIUM: "Premium Wellness Care",
};
const DEFAULT_CREDITS: Record<PlanType, number> = { ESSENTIAL: 1, COMPREHENSIVE: 2, PREMIUM: 3 };

/** Small muted helper line under a field. */
function Help({ children }: { children: React.ReactNode }) {
  return <span className="text-xs leading-snug text-[var(--color-text-muted)]">{children}</span>;
}

/**
 * Shared plan create/edit fields. Pure presentational server component — the
 * parent form's server action reads these via parsePlanForm. Price is shown in
 * major currency units; the action converts to cents.
 *
 * Plan type is fixed: chosen at create (passed in), shown read-only on edit.
 * Wellness credits show ONLY for PREMIUM — wellness is strictly Premium-only.
 */
export function PlanFields({ countries, initial, pinnedCountryId, planType }: Props) {
  const pinId = pinnedCountryId ?? initial?.countryId;
  const pinned = pinId ? countries.find((c) => c.id === pinId) : undefined;
  const priceMajor = initial ? (initial.monthlyPriceCents / 100).toFixed(2) : "";
  const effectiveType: PlanType = planType ?? initial?.planType ?? "COMPREHENSIVE";
  const isPremium = effectiveType === "PREMIUM";

  return (
    <div className="gh-admin-plan-fields flex flex-col gap-5">
      <FormSection title="Plan">
        {/* Country + plan type: fixed facts shown as read-only chips. */}
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

        <div>
          <span className="gh-field-label">Plan type</span>
          <p className="mt-1 font-semibold text-[var(--color-text-primary)]">
            {PLAN_TYPE_LABEL[effectiveType]}
          </p>
          <Help>Fixed — can&apos;t be changed after the plan is created.</Help>
          <input type="hidden" name="planType" value={effectiveType} />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Plan name</span>
          <input name="name" className="gh-input min-w-0" required defaultValue={initial?.name} placeholder="e.g. Essential Care" />
          <Help>Shown as the card title to customers.</Help>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">URL id (slug)</span>
          <input
            name="slug"
            className="gh-input min-w-0 font-mono text-sm"
            required
            defaultValue={initial?.slug}
            placeholder="essential-care"
          />
          <Help>Used in the web address. Lowercase, dashes-between-words. Leave as-is unless you know you need to change it.</Help>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Short description</span>
          <input
            name="shortDescription"
            className="gh-input min-w-0"
            defaultValue={initial?.shortDescription ?? ""}
            placeholder="e.g. Affordable monthly access to online GP care."
          />
          <Help>One line shown under the title on the pricing card.</Help>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Long description (optional)</span>
          <textarea
            name="longDescription"
            className="gh-textarea min-w-0"
            rows={3}
            defaultValue={initial?.longDescription ?? ""}
            placeholder="Optional. Most cards don't need this."
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Notes &amp; terms (optional)</span>
          <textarea
            name="notesTerms"
            className="gh-textarea min-w-0"
            rows={2}
            defaultValue={initial?.notesTerms ?? ""}
            placeholder="Optional small print shown under the card."
          />
        </label>
      </FormSection>

      <FormSection title="Billing" description="What the member is charged. This is the only price on this tab — per-visit prices live on the Consultations tab.">
        <label className="flex flex-col gap-1.5">
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
          <Help>What a member pays each month.</Help>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Currency</span>
          <input
            name="currencyCode"
            className="gh-input min-w-0 font-mono uppercase"
            required
            maxLength={8}
            defaultValue={initial?.currencyCode ?? "EUR"}
          />
          <Help>3-letter code, e.g. EUR.</Help>
        </label>
      </FormSection>

      <FormSection
        title="Monthly allowance"
        description="What the member receives each paid month. Consultation credits and wellness credits are separate — one buys GP visits, the other buys home test kits."
      >
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">GP consultation credits / month</span>
          <input
            name="monthlyConsultationCredits"
            className="gh-input min-w-0"
            type="number"
            min="0"
            defaultValue={initial?.monthlyConsultationCredits ?? DEFAULT_CREDITS[effectiveType]}
          />
          <Help>
            Essential 1, Comprehensive 2, Premium 3. Pick which GP services they can be spent on
            over on the Consultations tab.
          </Help>
        </label>
        {isPremium ? (
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Wellness credits / month</span>
            <input
              name="wellnessCreditsPerMonth"
              className="gh-input min-w-0"
              type="number"
              min="0"
              defaultValue={initial?.wellnessCreditsPerMonth ?? 1}
            />
            <Help>Earned every paid month and spent on home test kits. Premium only.</Help>
          </label>
        ) : (
          // Non-Premium: wellness is forced to 0 server-side; send an explicit 0.
          <input type="hidden" name="wellnessCreditsPerMonth" value="0" />
        )}
        <BenefitsUnlockField defaultValue={initial?.benefitsUnlockAfterPaidMonths ?? 2} />
        {isPremium ? (
          <label
            className="flex items-center gap-2 self-end text-sm font-medium text-[var(--color-text-primary)]"
            title="Let family members and a nominated person use this plan's credits (Premium only)"
          >
            <input type="checkbox" name="familyEnabled" className="size-4" defaultChecked={initial?.familyEnabled ?? false} />
            Family / nominated person can use the credits
          </label>
        ) : null}
      </FormSection>

      <FormSection title="Card & visibility" description="How the plan appears on the public pricing page.">
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Order on pricing page</span>
          <input
            name="displayOrder"
            className="gh-input min-w-0"
            type="number"
            min="0"
            defaultValue={initial?.displayOrder ?? 0}
          />
          <Help>Lower number shows first.</Help>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Badge (optional)</span>
          <input
            name="badgeLabel"
            className="gh-input min-w-0"
            defaultValue={initial?.badgeLabel ?? ""}
            placeholder="e.g. Most popular"
          />
          <Help>Small ribbon shown on the card corner.</Help>
        </label>

        <div className="gh-form-section__span-2 gh-admin-plan-checks flex flex-wrap gap-6 border-t border-[var(--color-border)] pt-5">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
            <input type="checkbox" name="isFeatured" className="size-4" defaultChecked={initial?.isFeatured ?? false} />
            Highlight this plan (recommended)
          </label>
          {initial ? (
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
              <input type="checkbox" name="isActive" className="size-4" defaultChecked={initial.isActive} />
              Visible to customers
            </label>
          ) : null}
        </div>
      </FormSection>
    </div>
  );
}

import { Plus } from "lucide-react";
import { Btn, Pill } from "../../_components/atoms";
import { ConfirmDeleteButton } from "../../_components/confirm-delete-button";
import type { MembershipPlanDetail } from "@/lib/admin/memberships-api";

type CountryOpt = { id: string; code: string; name: string };

/**
 * The plan's covered countries (§26, decision 34).
 *
 * The primary is listed first and cannot be removed — it is fixed at creation,
 * it defines the shared allowance pool (§21.4) and every enrollment is
 * attributed to it (§21.5).
 *
 * Both warnings are on screen, not behind a dialog, because both are about what
 * the *next* click does rather than about confirming this one:
 *
 *  - **adding** grants benefits to every existing member immediately, with no
 *    per-member action — a cost event an admin should see before choosing;
 *  - **removing** stops new bookings only; anything already booked keeps its
 *    price, and it also deletes that country's benefit rows.
 *
 * Coverage is not configuration. A country listed here with no benefit rows
 * gives members nothing at all (§20) — the level editor is where that is fixed,
 * and where it is badged.
 */
export function MembershipPlanCountries({
  plan,
  addable,
  addAction,
  removeAction,
}: {
  plan: MembershipPlanDetail;
  /** Active countries the plan does not already cover. */
  addable: CountryOpt[];
  addAction: (formData: FormData) => void;
  removeAction: (formData: FormData) => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <ul className="flex flex-col gap-2">
        {plan.countries.map((entry) => {
          const isPrimary = entry.countryId === plan.primaryCountryId;
          return (
            <li
              key={entry.countryId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] px-4 py-3"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {entry.country.name}
                </span>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">
                  {entry.country.code.toUpperCase()}
                </span>
                {isPrimary ? <Pill tone="brand">Primary</Pill> : null}
              </span>
              {isPrimary ? (
                <span className="text-portal-compact text-[var(--color-text-muted)]">
                  Fixed at creation — the included-visit pool lives here
                </span>
              ) : (
                <form action={removeAction}>
                  <input type="hidden" name="countryId" value={entry.countryId} />
                  <ConfirmDeleteButton
                    title={`Stop covering ${entry.country.name}?`}
                    message={`Members get no benefit for new bookings in ${entry.country.name}. Bookings already made keep the price they were charged. This country's benefit rules are deleted with it — re-adding it starts from an empty configuration.`}
                    className="gh-btn gh-btn-ghost text-[var(--color-status-error-text)]"
                  >
                    Remove
                  </ConfirmDeleteButton>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {addable.length > 0 ? (
        <form
          action={addAction}
          className="flex flex-wrap items-end gap-3 border-t border-[var(--color-border)] pt-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Add a country</span>
            <select name="countryId" className="gh-select min-w-[220px]" required defaultValue="">
              <option value="">Select a country…</option>
              {addable.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.name} ({country.code.toUpperCase()})
                </option>
              ))}
            </select>
            <span className="text-xs leading-snug text-[var(--color-text-muted)]">
              Every current member gains benefits there as soon as it is configured — there is no
              per-member step. Until you set up its benefits, members get nothing in that country.
            </span>
          </label>
          <div className="ml-auto">
            <Btn type="submit" iconLeft={<Plus className="size-4" />}>
              Add country
            </Btn>
          </div>
        </form>
      ) : (
        <p className="border-t border-[var(--color-border)] pt-4 text-portal-compact text-[var(--color-text-muted)]">
          Every active country is already covered.
        </p>
      )}
    </div>
  );
}

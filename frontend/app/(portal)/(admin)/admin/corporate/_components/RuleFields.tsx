"use client";

import { useState } from "react";
import type { CorporateCoverage } from "@/lib/admin/admin-api/corporate";

/**
 * The coverage half of a rule form, shared by the add + edit forms.
 *
 * A client component for one reason: the fields a rule needs depend on its
 * coverage, and showing all of them at once is what made this page unreadable —
 * a 10%-discount rule displayed an empty co-pay box next to a "physio-chiro"
 * placeholder that looked like a stored value. A discount rule now shows a
 * percentage and nothing else.
 *
 * Unmounted inputs are simply absent from the FormData, which the server action
 * already handles: it reads a rule's fields per coverage, so a co-pay box that
 * is not on screen cannot contribute a stale amount.
 */
export function RuleFields({
  currencyCode,
  defaults,
}: {
  currencyCode: string;
  defaults?: {
    coverage: CorporateCoverage;
    discountPercent: number;
    copayCents: number | null;
    annualLimit: number | null;
    limitGroup: string | null;
    appliesToBeneficiaries: boolean;
    isActive: boolean;
  };
}) {
  const [coverage, setCoverage] = useState<CorporateCoverage>(defaults?.coverage ?? "DISCOUNT");
  const [limited, setLimited] = useState(defaults?.annualLimit != null);

  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">Member pays</span>
        <select
          name="coverage"
          className="gh-select w-52"
          value={coverage}
          onChange={(event) => setCoverage(event.target.value as CorporateCoverage)}
        >
          <option value="DISCOUNT">A percentage less</option>
          <option value="COPAY">A fixed amount</option>
          <option value="INCLUDED">Nothing — it&rsquo;s free</option>
        </select>
      </label>

      {coverage === "DISCOUNT" ? (
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Discount</span>
          <span className="inline-flex items-center gap-1.5">
            <input
              type="number"
              name="discountPercent"
              min={1}
              max={100}
              step="0.5"
              className="gh-input w-24"
              defaultValue={defaults?.discountPercent || 15}
              required
            />
            <span className="text-portal-compact text-[var(--color-text-muted)]">% off</span>
          </span>
        </label>
      ) : null}

      {coverage === "COPAY" ? (
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Member pays exactly</span>
          <span className="inline-flex items-center gap-1.5">
            <input
              type="number"
              name="copayAmount"
              min={0}
              step="0.01"
              className="gh-input w-28"
              defaultValue={defaults?.copayCents != null ? (defaults.copayCents / 100).toFixed(2) : ""}
              required
            />
            <span className="text-portal-compact text-[var(--color-text-muted)]">
              {currencyCode}
            </span>
          </span>
        </label>
      ) : null}

      {coverage === "INCLUDED" ? (
        <p className="pb-2 text-portal-compact text-[var(--color-text-muted)]">
          Fully covered — the member is charged nothing.
        </p>
      ) : null}

      <label className="inline-flex items-center gap-1.5 pb-2 text-portal-compact text-[var(--color-text-muted)]">
        <input
          type="checkbox"
          checked={limited}
          onChange={(event) => setLimited(event.target.checked)}
        />
        Cap the number of visits
      </label>

      {limited ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Visits per year</span>
            <input
              type="number"
              name="annualLimit"
              min={1}
              max={365}
              step={1}
              className="gh-input w-24"
              defaultValue={defaults?.annualLimit ?? 5}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            {/* Two rules with the same group name share ONE counter — how
                "physiotherapy or chiropractic, up to 5x" is 5 across both. */}
            <span className="gh-field-label">Share this cap with (optional)</span>
            <input
              name="limitGroup"
              className="gh-input w-44"
              maxLength={60}
              placeholder="a name, e.g. physio-chiro"
              defaultValue={defaults?.limitGroup ?? ""}
            />
          </label>
        </>
      ) : null}

      <label className="inline-flex items-center gap-1.5 pb-2 text-portal-compact text-[var(--color-text-muted)]">
        <input
          type="checkbox"
          name="appliesToBeneficiaries"
          defaultChecked={defaults?.appliesToBeneficiaries ?? true}
        />
        Family too
      </label>
      <label className="inline-flex items-center gap-1.5 pb-2 text-portal-compact text-[var(--color-text-muted)]">
        <input type="checkbox" name="isActive" defaultChecked={defaults?.isActive ?? true} />
        Active
      </label>
    </>
  );
}

"use client";

import { useState } from "react";

type Props = {
  /** Initial value; defaults to the standard 2-month policy. */
  defaultValue?: number;
};

/** Below this many paid months, warn that it undercuts the standard policy. */
const STANDARD_UNLOCK_MONTHS = 2;

/**
 * Numeric input for `benefitsUnlockAfterPaidMonths` with a live inline warning
 * when the admin sets it below the standard 2-month benefit policy. Client
 * component so the warning updates as they type; the value is still read from
 * FormData by the parent form's server action (parsePlanForm).
 */
export function BenefitsUnlockField({ defaultValue = STANDARD_UNLOCK_MONTHS }: Props) {
  const [value, setValue] = useState<number>(defaultValue);
  const belowStandard = Number.isFinite(value) && value < STANDARD_UNLOCK_MONTHS;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="gh-field-label">Benefits unlock after (paid months)</span>
      <input
        name="benefitsUnlockAfterPaidMonths"
        className="gh-input min-w-0"
        type="number"
        min="0"
        max="24"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => setValue(e.currentTarget.valueAsNumber)}
      />
      <span className="text-xs leading-snug text-[var(--color-text-muted)]">
        How many paid months before plan benefits switch on. Standard is {STANDARD_UNLOCK_MONTHS}.
      </span>
      {belowStandard ? (
        <span className="text-xs leading-snug text-[var(--color-status-warning-text)]">
          This is below the standard 2-month benefit policy.
        </span>
      ) : null}
    </label>
  );
}

"use client";

import { useState } from "react";
import type { MembershipAllowanceView } from "@/lib/admin/memberships-api";

/**
 * Manual allowance adjustment (§7) — goodwill, and correcting a bad import.
 *
 * A client component only so the reason field can gate the submit button: an
 * adjustment with no written reason is unreviewable, and the audit row plus
 * that sentence are the entire trail for a counter moved by hand outside every
 * configured rule.
 *
 * The delta is CLAMPED server-side into [0, allocated], not rejected — "+5" on
 * a counter with 3 used means "give it all back". The panel says so, because an
 * admin who asks for 5 and gets 3 should understand that as the rule rather
 * than as a bug.
 */
export function MembershipAllowanceAdjust({
  allowances,
  action,
}: {
  allowances: MembershipAllowanceView[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [benefitId, setBenefitId] = useState(allowances[0]?.benefitId ?? "");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");

  const selected = allowances.find((row) => row.benefitId === benefitId) ?? null;
  const parsedDelta = Number(delta.trim());
  const deltaValid =
    delta.trim() !== "" && Number.isInteger(parsedDelta) && parsedDelta !== 0;
  const canSubmit = Boolean(benefitId) && deltaValid && reason.trim().length >= 3;

  // What the server will actually land on, given the clamp.
  const projectedUsed = selected
    ? Math.min(Math.max(0, selected.used - (deltaValid ? parsedDelta : 0)), selected.allocated)
    : null;

  return (
    <form action={action} className="flex flex-col gap-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Allowance</span>
          <select
            name="benefitId"
            className="gh-select"
            value={benefitId}
            onChange={(e) => setBenefitId(e.target.value)}
          >
            {allowances.map((row) => (
              <option key={row.benefitId} value={row.benefitId}>
                {row.target} — {row.remaining} of {row.allocated} left
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="gh-field-label">Units to give back</span>
          <input
            name="delta"
            type="number"
            className="gh-input"
            inputMode="numeric"
            step={1}
            min={-999}
            max={999}
            placeholder="1"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
          />
          <span className="text-portal-meta text-[var(--color-text-muted)]">
            Positive gives units back, negative takes them. Clamped to what the term
            allows.
          </span>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="gh-field-label">Reason</span>
        <textarea
          name="reason"
          className="gh-input"
          rows={2}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why this member's allowance is being changed"
        />
        <span className="text-portal-meta text-[var(--color-text-muted)]">
          Recorded against your name in the audit log, with the requested and applied
          amounts kept separately.
        </span>
      </label>

      {selected && deltaValid && projectedUsed != null ? (
        <p className="text-portal-compact text-[var(--color-text-body)]">
          {selected.target}: used {selected.used} → {projectedUsed} of {selected.allocated}
          {projectedUsed === selected.used
            ? " — nothing to apply, but the attempt is still logged."
            : ""}
        </p>
      ) : null}

      <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
        <button type="submit" className="gh-btn gh-btn-primary" disabled={!canSubmit}>
          Adjust allowance
        </button>
      </div>
    </form>
  );
}

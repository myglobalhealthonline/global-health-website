"use client";

import { useMemo, useState } from "react";
import { ConfirmDeleteButton } from "./confirm-delete-button";

/** Fat-finger guard: plan credits top out at 3/month (Premium tier), so a
 *  legitimate manual correction — even a multi-month clawback — should never
 *  need to move a balance by more than this in one submission. */
const MAX_ABS_DELTA = 100;

type SubscriberOption = {
  id: string;
  label: string;
  balances: { consultation: number; wellness: number };
};

/**
 * Client wrapper around the "Support override" adjust-credits form. Adds a
 * live "Current balance → After adjustment" preview and a client-side bound
 * on `delta`, on top of the server-side validation in
 * adminAdjustCreditsBodySchema (delta must still be non-zero there).
 */
export function CreditAdjustForm({
  action,
  subscribers,
}: {
  action: (formData: FormData) => void;
  subscribers: SubscriberOption[];
}) {
  const [subscriptionId, setSubscriptionId] = useState(subscribers[0]?.id ?? "");
  const [kind, setKind] = useState<"CONSULTATION" | "WELLNESS">("CONSULTATION");
  const [delta, setDelta] = useState("");

  const selected = subscribers.find((s) => s.id === subscriptionId) ?? subscribers[0];
  const currentBalance = selected
    ? kind === "CONSULTATION"
      ? selected.balances.consultation
      : selected.balances.wellness
    : 0;

  const deltaNum = Number(delta);
  const isValidDelta = delta.trim() !== "" && Number.isInteger(deltaNum) && deltaNum !== 0;
  const outOfBounds = isValidDelta && Math.abs(deltaNum) > MAX_ABS_DELTA;
  const afterBalance = isValidDelta ? currentBalance + deltaNum : currentBalance;

  const previewLabel = useMemo(() => {
    if (!isValidDelta) return `${currentBalance} → —`;
    return `${currentBalance} → ${afterBalance}`;
  }, [currentBalance, afterBalance, isValidDelta]);

  const requestId = useMemo(() => crypto.randomUUID(), []);

  return (
    <form action={action} className="gh-admin-subscription-adjust-form flex flex-wrap items-end gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        <span>Subscriber</span>
        <select
          name="subscriptionId"
          className="gh-select"
          required
          style={{ minWidth: 240 }}
          value={subscriptionId}
          onChange={(e) => setSubscriptionId(e.target.value)}
        >
          {subscribers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        <span>Kind</span>
        <select
          name="kind"
          className="gh-select"
          style={{ minWidth: 130 }}
          value={kind}
          onChange={(e) => setKind(e.target.value as "CONSULTATION" | "WELLNESS")}
        >
          <option value="CONSULTATION">Consultation</option>
          <option value="WELLNESS">Wellness</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        <span>Delta</span>
        <input
          name="delta"
          type="number"
          className="gh-input"
          style={{ width: 90 }}
          placeholder="±"
          required
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
        <span>Category</span>
        <select name="reason" className="gh-select" defaultValue="ADJUSTMENT" style={{ minWidth: 130 }}>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="CLAWBACK">Clawback</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]" style={{ flex: "1 1 260px" }}>
        <span>Reason (required, audited)</span>
        <input
          name="note"
          type="text"
          className="gh-input"
          minLength={8}
          maxLength={500}
          required
          placeholder="Why is this adjustment being made?"
        />
      </label>

      <div className="flex flex-col gap-1 text-xs" style={{ minWidth: 160 }}>
        <span className="text-[var(--color-text-muted)]">Balance preview</span>
        <span
          className={`font-mono font-semibold ${outOfBounds ? "text-[var(--color-status-error-text)]" : "text-[var(--color-text-primary)]"}`}
        >
          {previewLabel}
        </span>
        {outOfBounds ? (
          <span className="text-[var(--color-status-error-text)]">
            Exceeds ±{MAX_ABS_DELTA} per submission
          </span>
        ) : null}
      </div>

      <ConfirmDeleteButton
        title="Apply credit adjustment?"
        message={`Apply this manual balance adjustment (${previewLabel})? It writes an audited ledger entry and cannot be silently undone.`}
        className="gh-btn gh-btn-secondary"
        ariaLabel="Apply credit adjustment"
        style={{ minHeight: 36, padding: "0 14px" }}
        disabled={!isValidDelta || outOfBounds}
      >
        Apply override
      </ConfirmDeleteButton>
    </form>
  );
}

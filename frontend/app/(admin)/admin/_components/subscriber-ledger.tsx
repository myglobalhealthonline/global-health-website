"use client";

import { useState } from "react";
import {
  fetchAdminSubscriptionLedger,
  type AdminCreditLedgerEntry,
} from "@/lib/admin/plans-api";

/** Admin-side credit provenance (§4d). English-only (internal admin UI). */
const REASON_LABELS: Record<string, string> = {
  MONTHLY_GRANT: "Monthly credits",
  MONTHLY_EARN: "Wellness earned",
  RESET_EXPIRE: "Previous month reset",
  RESERVED: "Reserved",
  CONSUMED: "Used",
  REDEEMED: "Redeemed",
  RELEASED: "Released",
  ADJUSTMENT: "Manual adjustment",
  CLAWBACK: "Clawed back",
};

type LedgerState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: AdminCreditLedgerEntry[] };

/**
 * Lazy, per-subscriber credit-activity expander for the admin subscriptions
 * table. Fetches the merged consultation + wellness ledger on first open so the
 * admin can see how a balance was reached — and that a manual adjustment was
 * audited — without bulk-loading every subscriber's history.
 */
export function AdminSubscriberLedger({ subscriptionId }: { subscriptionId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LedgerState>({ status: "idle" });

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && state.status === "idle") {
      setState({ status: "loading" });
      const res = await fetchAdminSubscriptionLedger(subscriptionId);
      setState(res.ok ? { status: "ready", rows: res.data.ledger } : { status: "error", message: res.message });
    }
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={toggle}
        className="text-[11px] font-semibold underline underline-offset-2"
        style={{ color: "var(--color-brand-primary)" }}
        aria-expanded={open}
      >
        {open ? "Hide activity" : "View activity"}
      </button>
      {open ? (
        <div className="mt-2 min-w-[220px]">
          {state.status === "loading" ? (
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
          ) : state.status === "error" ? (
            <p className="text-[11px]" style={{ color: "var(--color-status-error)" }}>{state.message}</p>
          ) : state.status === "ready" && state.rows.length > 0 ? (
            <ul className="space-y-1">
              {state.rows.slice(0, 12).map((entry, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-[11px]">
                  <span style={{ color: "var(--color-text-body)" }}>
                    <span
                      className="mr-1.5 rounded px-1 py-0.5 text-[10px] font-semibold"
                      style={{ background: "var(--color-background-soft)", color: "var(--color-text-muted)" }}
                    >
                      {entry.kind === "WELLNESS" ? "WL" : "GP"}
                    </span>
                    {REASON_LABELS[entry.reason] ?? entry.reason}
                  </span>
                  <span className="flex items-center gap-2">
                    <span
                      className="font-semibold [font-variant-numeric:tabular-nums]"
                      style={{ color: entry.deltaCredits >= 0 ? "var(--color-brand-primary)" : "#b3261e" }}
                    >
                      {entry.deltaCredits >= 0 ? `+${entry.deltaCredits}` : `−${Math.abs(entry.deltaCredits)}`}
                    </span>
                    <span style={{ color: "var(--color-text-muted)" }}>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>No activity.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

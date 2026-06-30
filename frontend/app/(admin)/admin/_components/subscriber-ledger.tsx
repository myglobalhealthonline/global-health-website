"use client";

import { useState } from "react";

/**
 * Client-safe local type. Mirrors `AdminCreditLedgerEntry` in
 * lib/admin/plans-api.ts — that module is `server-only` (it forwards cookies
 * via next/headers), so it MUST NOT be imported into this client component.
 * The data is fetched over the same-origin `/api/admin/*` proxy instead.
 */
type AdminCreditLedgerEntry = {
  kind: "CONSULTATION" | "WELLNESS";
  deltaCredits: number;
  reason: string;
  createdAt: string;
};

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
      // Same-origin admin proxy — the httpOnly admin cookie rides along
      // automatically (matches the other admin client components).
      try {
        const res = await fetch(`/api/admin/subscriptions/${subscriptionId}/ledger`, {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
          data?: { ledger?: AdminCreditLedgerEntry[] };
        };
        if (!res.ok || !json?.ok) {
          setState({ status: "error", message: json?.message ?? "Failed to load activity" });
          return;
        }
        setState({ status: "ready", rows: json.data?.ledger ?? [] });
      } catch {
        setState({ status: "error", message: "Could not reach the server" });
      }
    }
  }

  return (
    <div className="gh-admin-subscriber-ledger mt-1.5">
      <button
        type="button"
        onClick={toggle}
        className="gh-admin-subscriber-ledger__toggle text-[11px] font-semibold underline underline-offset-2"
        style={{ color: "var(--color-brand-primary)" }}
        aria-expanded={open}
      >
        {open ? "Hide activity" : "View activity"}
      </button>
      {open ? (
        <div className="gh-admin-subscriber-ledger__panel mt-2 min-w-[220px]">
          {state.status === "loading" ? (
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
          ) : state.status === "error" ? (
            <p className="text-[11px]" style={{ color: "var(--color-status-error)" }}>{state.message}</p>
          ) : state.status === "ready" && state.rows.length > 0 ? (
            <ul className="gh-admin-subscriber-ledger__list space-y-1">
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

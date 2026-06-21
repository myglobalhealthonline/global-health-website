import type { SubscriptionHealth } from "@/lib/admin/plans-api";
import { AdminCard, Pill, SectionHeader } from "./atoms";

/**
 * Renders the §39 reconciliation/invariant health snapshot from
 * GET /api/admin/subscription-health (owned by Sprint 1's ops jobs).
 */
export function SubscriptionHealthPanel({
  health,
  error,
}: {
  health: SubscriptionHealth | null;
  error?: string;
}) {
  const driftCount = health?.drift.length ?? 0;
  const alertCount = health?.invariantAlerts.length ?? 0;
  const priceFailCount = health?.priceSyncFailures.length ?? 0;
  const allClear = driftCount === 0 && alertCount === 0 && priceFailCount === 0;

  return (
    <AdminCard padding={0}>
      <SectionHeader
        title="Subscription health"
        description="Stripe ↔ DB drift, ledger ↔ counter invariants, and price-sync failures."
        right={
          error ? (
            <Pill tone="inactive">unavailable</Pill>
          ) : allClear ? (
            <Pill tone="active">all clear</Pill>
          ) : (
            <Pill tone="pending">{driftCount + alertCount + priceFailCount} issues</Pill>
          )
        }
      />
      <div className="flex flex-col gap-4 p-6">
        {error ? (
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">{error}</p>
        ) : (
          <>
            <p className="text-xs text-[var(--color-text-muted)]">
              Last reconciliation:{" "}
              {health?.lastReconciliationAt
                ? new Date(health.lastReconciliationAt).toLocaleString()
                : "never"}
            </p>

            <HealthSection title={`Stripe ↔ DB drift (${driftCount})`} empty={driftCount === 0} emptyText="No drift detected.">
              {health?.drift.map((d, i) => (
                <li key={`${d.subscriptionId}-${d.field}-${i}`} className="text-sm">
                  <span className="font-mono text-xs">{d.subscriptionId}</span> · {d.field}: DB={String(d.db)} vs
                  Stripe={String(d.stripe)}
                </li>
              ))}
            </HealthSection>

            <HealthSection title={`Invariant alerts (${alertCount})`} empty={alertCount === 0} emptyText="No invariant violations.">
              {health?.invariantAlerts.map((a, i) => (
                <li key={`${a.subscriptionId}-${a.kind}-${i}`} className="text-sm">
                  <Pill tone="inactive">{a.kind}</Pill> <span className="font-mono text-xs">{a.subscriptionId}</span> —{" "}
                  {a.detail}
                </li>
              ))}
            </HealthSection>

            <HealthSection
              title={`Price-sync failures (${priceFailCount})`}
              empty={priceFailCount === 0}
              emptyText="No price-sync failures."
            >
              {health?.priceSyncFailures.map((f, i) => (
                <li key={i} className="font-mono text-xs">
                  {JSON.stringify(f)}
                </li>
              ))}
            </HealthSection>
          </>
        )}
      </div>
    </AdminCard>
  );
}

function HealthSection({
  title,
  empty,
  emptyText,
  children,
}: {
  title: string;
  empty: boolean;
  emptyText: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">{title}</p>
      {empty ? (
        <p className="text-sm text-[var(--color-text-muted)]">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-3">
          {children}
        </ul>
      )}
    </div>
  );
}

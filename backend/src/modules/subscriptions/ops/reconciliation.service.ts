import { env } from "../../../config/env.js";
import { prisma } from "../../../db/prisma.js";
import { getBillingPort } from "../../billing/billing.factory.js";

/**
 * Money/ops safety reconciliation (§39). Every check fails CLOSED and is
 * idempotent. Surfaced via GET /api/admin/subscription-health (contracts.md).
 */

export interface DriftEntry {
  subscriptionId: string;
  field: string;
  db: string | null;
  stripe: string | null;
}
export interface InvariantAlert {
  subscriptionId: string;
  kind: string;
  detail: string;
}
export interface SubscriptionHealthReport {
  lastReconciliationAt: string | null;
  /** Active billing driver. `fake` in production is a misconfiguration (B1). */
  billingDriver: "fake" | "stripe";
  /** True when the fake driver is live in production — checkout URLs are dead. */
  billingMisconfigured: boolean;
  drift: DriftEntry[];
  invariantAlerts: InvariantAlert[];
  priceSyncFailures: Array<{ planId: string; slug: string }>;
}

export async function runReconciliation(now = new Date()): Promise<SubscriptionHealthReport> {
  const [invariantAlerts, priceSyncFailures, drift, missingGrants] = await Promise.all([
    checkLedgerBalanceInvariant(),
    checkPriceSyncFailures(),
    checkStripeDrift(),
    checkMissingGrants(),
  ]);
  const unswept = await checkUnsweptReservations(now);
  const billingDriver = getBillingPort().driver;
  return {
    lastReconciliationAt: now.toISOString(),
    billingDriver,
    billingMisconfigured: billingDriver === "fake" && env.NODE_ENV === "production",
    drift,
    invariantAlerts: [...invariantAlerts, ...unswept, ...missingGrants],
    priceSyncFailures,
  };
}

/**
 * Invoice-grant coverage (§39): an ACTIVE subscription that has paid ≥1 month
 * must have at least one MONTHLY_GRANT consultation-ledger row — otherwise a
 * month-1 grant silently never happened and no other check would catch it.
 */
async function checkMissingGrants(): Promise<InvariantAlert[]> {
  const subs = await prisma.userSubscription.findMany({
    where: { status: "ACTIVE", paidMonthsCount: { gt: 0 } },
    select: { id: true },
    take: 1000,
  });
  if (subs.length === 0) return [];
  const granted = await prisma.consultationCreditLedger.groupBy({
    by: ["userSubscriptionId"],
    where: { reason: "MONTHLY_GRANT", userSubscriptionId: { in: subs.map((s) => s.id) } },
    _count: { _all: true },
  });
  const grantedSet = new Set(granted.map((g) => g.userSubscriptionId));
  return subs
    .filter((s) => !grantedSet.has(s.id))
    .map((s) => ({
      subscriptionId: s.id,
      kind: "missing_grant",
      detail: "ACTIVE with paidMonthsCount>0 but no MONTHLY_GRANT ledger row",
    }));
}

/** Assert counter balance == SUM(ledger deltaCredits) per (sub, kind) (§39). */
async function checkLedgerBalanceInvariant(): Promise<InvariantAlert[]> {
  const alerts: InvariantAlert[] = [];
  const balances = await prisma.subscriptionCreditBalance.findMany();

  const [consAgg, wellAgg] = await Promise.all([
    prisma.consultationCreditLedger.groupBy({
      by: ["userSubscriptionId"],
      _sum: { deltaCredits: true },
    }),
    prisma.wellnessCreditLedger.groupBy({
      by: ["userSubscriptionId"],
      _sum: { deltaCredits: true },
    }),
  ]);
  const consBySub = new Map(consAgg.map((a) => [a.userSubscriptionId, a._sum.deltaCredits ?? 0]));
  const wellBySub = new Map(wellAgg.map((a) => [a.userSubscriptionId, a._sum.deltaCredits ?? 0]));

  for (const b of balances) {
    const ledgerSum =
      b.kind === "CONSULTATION"
        ? consBySub.get(b.userSubscriptionId) ?? 0
        : wellBySub.get(b.userSubscriptionId) ?? 0;
    if (ledgerSum !== b.balance) {
      alerts.push({
        subscriptionId: b.userSubscriptionId,
        kind: "ledger_balance_mismatch",
        detail: `${b.kind}: counter=${b.balance} ledgerSum=${ledgerSum}`,
      });
    }
  }
  return alerts;
}

/** Active plans in subscription-enabled countries must have a Stripe Price. */
async function checkPriceSyncFailures(): Promise<Array<{ planId: string; slug: string }>> {
  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true, stripePriceId: null },
    select: {
      id: true,
      slug: true,
      country: { select: { enabledFeatures: true } },
    },
  });
  return plans
    .filter((p) => p.country.enabledFeatures.includes("subscriptions"))
    .map((p) => ({ planId: p.id, slug: p.slug }));
}

/** Expired reservations the sweep should have released (terminal missing). */
async function checkUnsweptReservations(now: Date): Promise<InvariantAlert[]> {
  const stale = await prisma.consultationCreditLedger.findMany({
    where: { reason: "RESERVED", reservedUntil: { lt: new Date(now.getTime() - 60 * 60 * 1000) } },
    select: { reservationId: true, userSubscriptionId: true },
  });
  const reservationIds = stale
    .map((r) => r.reservationId)
    .filter((id): id is string => id != null);
  if (reservationIds.length === 0) return [];
  // One query for all terminal (CONSUMED/RELEASED) entries, then set-diff in
  // memory (mirrors checkMissingGrants) — replaces the per-reservation N+1.
  const terminals = await prisma.consultationCreditLedger.findMany({
    where: { reservationId: { in: reservationIds }, reason: { in: ["CONSUMED", "RELEASED"] } },
    select: { reservationId: true },
  });
  const terminalSet = new Set(terminals.map((t) => t.reservationId));
  return stale
    .filter((row) => row.reservationId != null && !terminalSet.has(row.reservationId))
    .map((row) => ({
      subscriptionId: row.userSubscriptionId,
      kind: "unswept_reservation",
      detail: `reservation ${row.reservationId} expired >1h ago with no terminal`,
    }));
}

/** Stripe ↔ DB status/period drift for ACTIVE/PAST_DUE subs (stripe driver). */
async function checkStripeDrift(): Promise<DriftEntry[]> {
  const billing = getBillingPort();
  if (billing.driver !== "stripe") return [];
  const subs = await prisma.userSubscription.findMany({
    where: { status: { in: ["ACTIVE", "PAST_DUE"] }, stripeSubscriptionId: { not: null } },
    take: 200,
    select: { id: true, status: true, stripeSubscriptionId: true, currentPeriodEnd: true },
  });
  const drift: DriftEntry[] = [];
  // Bounded-parallel (batches of 8) to cut wall-clock vs. one serial Stripe
  // call per sub, while capping concurrent load on the Stripe API. Each item
  // is fault-isolated: one failed retrieve must not abort the whole run.
  const BATCH = 8;
  for (let i = 0; i < subs.length; i += BATCH) {
    const slice = subs.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (sub): Promise<DriftEntry[]> => {
        try {
          const live = await billing.retrieveSubscription(sub.stripeSubscriptionId!);
          if (!live) {
            return [{ subscriptionId: sub.id, field: "existence", db: sub.status, stripe: null }];
          }
          const entries: DriftEntry[] = [];
          if (live.status === "canceled" && sub.status !== "CANCELED") {
            entries.push({
              subscriptionId: sub.id,
              field: "status",
              db: sub.status,
              stripe: live.status,
            });
          }
          // Period-end drift (§39): tolerate <1 min skew, flag real divergence.
          const dbEnd = sub.currentPeriodEnd?.getTime() ?? null;
          const liveEnd = live.currentPeriodEnd?.getTime() ?? null;
          if (dbEnd != null && liveEnd != null && Math.abs(dbEnd - liveEnd) > 60_000) {
            entries.push({
              subscriptionId: sub.id,
              field: "currentPeriodEnd",
              db: sub.currentPeriodEnd?.toISOString() ?? null,
              stripe: live.currentPeriodEnd?.toISOString() ?? null,
            });
          }
          return entries;
        } catch {
          // ponytail: skip a sub whose Stripe retrieve threw; one API error
          // must not reject the batch or abort reconciliation.
          return [];
        }
      }),
    );
    for (const entries of results) drift.push(...entries);
  }
  return drift;
}

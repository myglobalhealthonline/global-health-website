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
  drift: DriftEntry[];
  invariantAlerts: InvariantAlert[];
  priceSyncFailures: Array<{ planId: string; slug: string }>;
}

export async function runReconciliation(now = new Date()): Promise<SubscriptionHealthReport> {
  const [invariantAlerts, priceSyncFailures, drift] = await Promise.all([
    checkLedgerBalanceInvariant(),
    checkPriceSyncFailures(),
    checkStripeDrift(),
  ]);
  const unswept = await checkUnsweptReservations(now);
  return {
    lastReconciliationAt: now.toISOString(),
    drift,
    invariantAlerts: [...invariantAlerts, ...unswept],
    priceSyncFailures,
  };
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
  const alerts: InvariantAlert[] = [];
  for (const row of stale) {
    if (!row.reservationId) continue;
    const terminal = await prisma.consultationCreditLedger.findFirst({
      where: { reservationId: row.reservationId, reason: { in: ["CONSUMED", "RELEASED"] } },
      select: { id: true },
    });
    if (!terminal) {
      alerts.push({
        subscriptionId: row.userSubscriptionId,
        kind: "unswept_reservation",
        detail: `reservation ${row.reservationId} expired >1h ago with no terminal`,
      });
    }
  }
  return alerts;
}

/** Stripe ↔ DB status/period drift for ACTIVE/PAST_DUE subs (stripe driver). */
async function checkStripeDrift(): Promise<DriftEntry[]> {
  const billing = getBillingPort();
  if (billing.driver !== "stripe") return [];
  const subs = await prisma.userSubscription.findMany({
    where: { status: { in: ["ACTIVE", "PAST_DUE"] }, stripeSubscriptionId: { not: null } },
    take: 200,
    select: { id: true, status: true, stripeSubscriptionId: true },
  });
  const drift: DriftEntry[] = [];
  for (const sub of subs) {
    const live = await billing.retrieveSubscription(sub.stripeSubscriptionId!);
    if (!live) {
      drift.push({ subscriptionId: sub.id, field: "existence", db: sub.status, stripe: null });
      continue;
    }
    const liveCanceled = live.status === "canceled";
    if (liveCanceled && sub.status !== "CANCELED") {
      drift.push({ subscriptionId: sub.id, field: "status", db: sub.status, stripe: live.status });
    }
  }
  return drift;
}

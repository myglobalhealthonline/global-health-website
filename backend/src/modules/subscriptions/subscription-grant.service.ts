import { Prisma, type PerkKey } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { grantMonthlyCredits } from "../credits/credit-balance.service.js";
import { asPlanSnapshot, type PlanSnapshot } from "./plan-snapshot.js";
import { captureSnapshot } from "./plan-snapshot.service.js";

type Tx = Prisma.TransactionClient;

export type BillingReason = "subscription_create" | "subscription_cycle";

export interface InvoicePaidInput {
  stripeSubscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  billingReason: BillingReason;
  amountPaid: number;
}

export interface InvoicePaidResult {
  handled: boolean;
  granted: boolean;
  subscriptionId?: string;
  userId?: string;
  newlyUnlockedPerks: PerkKey[];
  consultationCreditsGranted?: number;
  wellnessCreditsGranted?: number;
}

/**
 * Reconcile per-subscriber SubscriptionPerkGrant rows from the snapshot's perk
 * rules + paidMonthsCount (§36.13). Returns the perkKeys that transitioned to
 * unlocked (AUTO) on this run — the caller audits PERK_UNLOCKED for those.
 *
 * - MONTH_1            → AUTO immediately.
 * - AFTER_PAID_MONTHS  → AUTO once paidMonthsCount reaches the threshold.
 * - MANUAL_APPROVAL    → PENDING (awaits an admin; never auto-approved here).
 * - NOT_AVAILABLE      → no grant.
 */
export async function syncPerkGrants(
  tx: Tx,
  subscriptionId: string,
  snapshot: PlanSnapshot,
  paidMonthsCount: number,
): Promise<PerkKey[]> {
  const existing = await tx.subscriptionPerkGrant.findMany({
    where: { userSubscriptionId: subscriptionId },
  });
  const byKey = new Map(existing.map((g) => [g.perkKey, g]));
  const newlyUnlocked: PerkKey[] = [];

  for (const rule of snapshot.perkRules) {
    const current = byKey.get(rule.perkKey);
    if (rule.unlockMode === "MONTH_1") {
      if (current?.status !== "AUTO" && current?.status !== "APPROVED") {
        await upsertGrant(tx, subscriptionId, rule.perkKey, "AUTO");
        newlyUnlocked.push(rule.perkKey);
      }
    } else if (rule.unlockMode === "AFTER_PAID_MONTHS") {
      const threshold = rule.unlockAfterPaidMonths ?? Number.POSITIVE_INFINITY;
      if (paidMonthsCount >= threshold) {
        if (current?.status !== "AUTO" && current?.status !== "APPROVED") {
          await upsertGrant(tx, subscriptionId, rule.perkKey, "AUTO");
          newlyUnlocked.push(rule.perkKey);
        }
      }
    } else if (rule.unlockMode === "MANUAL_APPROVAL") {
      if (!current) {
        await upsertGrant(tx, subscriptionId, rule.perkKey, "PENDING");
      }
    }
    // NOT_AVAILABLE → nothing.
  }
  return newlyUnlocked;
}

async function upsertGrant(
  tx: Tx,
  subscriptionId: string,
  perkKey: PerkKey,
  status: "AUTO" | "PENDING" | "APPROVED",
): Promise<void> {
  await tx.subscriptionPerkGrant.upsert({
    where: { userSubscriptionId_perkKey: { userSubscriptionId: subscriptionId, perkKey } },
    create: { userSubscriptionId: subscriptionId, perkKey, status },
    update: { status },
  });
}

/**
 * Period-keyed invoice grant (§36.2). One atomic tx:
 *   - (cycle) apply any pending plan change + re-snapshot (§36.4/§36.9)
 *   - reset prior unused consultation credits + grant the new month's
 *   - increment paidMonthsCount, set period, promote INCOMPLETE/PAST_DUE→ACTIVE
 *   - reconcile perk grants
 *
 * Idempotent: the period grant key makes a duplicate invoice (Stripe retry or
 * multiple invoices per period) a no-op — `granted:false`.
 */
export async function processInvoicePaid(
  input: InvoicePaidInput,
): Promise<InvoicePaidResult> {
  if (input.amountPaid <= 0) {
    // Trials / €0 coupon invoices never grant or advance paidMonthsCount (§36.2).
    return { handled: true, granted: false, newlyUnlockedPerks: [] };
  }

  return prisma.$transaction(
    async (tx) => {
    const sub = await tx.userSubscription.findUnique({
      where: { stripeSubscriptionId: input.stripeSubscriptionId },
    });
    if (!sub) {
      // checkout.session.completed hasn't linked the sub yet (out-of-order).
      // Return unhandled so the caller can re-fetch / retry.
      return { handled: false, granted: false, newlyUnlockedPerks: [] };
    }

    // Monotonic guard (§38.7): ignore a stale period older than what we synced.
    if (sub.currentPeriodStart && input.periodStart < sub.currentPeriodStart) {
      return {
        handled: true,
        granted: false,
        subscriptionId: sub.id,
        userId: sub.userId,
        newlyUnlockedPerks: [],
      };
    }

    // Apply a scheduled plan change at the cycle boundary (Q10=B), then
    // re-snapshot from the now-current plan so admin edits take effect.
    let planId = sub.planId;
    let stripePriceId = sub.stripePriceId;
    let snapshotVersion = sub.snapshotVersion;
    let clearedPending = false;
    if (
      input.billingReason === "subscription_cycle" &&
      sub.pendingPlanId &&
      (!sub.pendingChangeEffectiveAt || sub.pendingChangeEffectiveAt <= input.periodStart)
    ) {
      planId = sub.pendingPlanId;
      stripePriceId = sub.pendingStripePriceId ?? sub.stripePriceId;
      clearedPending = true;
    }

    let snapshot = asPlanSnapshot(sub.planSnapshot);
    if (input.billingReason === "subscription_cycle" || !snapshot || clearedPending) {
      snapshotVersion += 1;
      snapshot = await captureSnapshot(planId, snapshotVersion, tx);
    }

    const granted = await grantMonthlyCredits(tx, {
      userSubscriptionId: sub.id,
      userId: sub.userId,
      periodStart: input.periodStart,
      consultationCredits: snapshot.monthlyConsultationCredits,
      wellnessCredits: snapshot.wellnessCreditsPerMonth,
    });

    if (!granted) {
      // Duplicate period (retry / same-period reprocess). The original grant for
      // this period already persisted the snapshot and advanced paidMonthsCount,
      // so this is a pure idempotent no-op: any snapshot captured above is
      // intentionally discarded and nothing is written.
      return {
        handled: true,
        granted: false,
        subscriptionId: sub.id,
        userId: sub.userId,
        newlyUnlockedPerks: [],
      };
    }

    const paidMonthsCount = sub.paidMonthsCount + 1;
    await tx.userSubscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        planId,
        stripePriceId,
        planSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        snapshotVersion,
        paidMonthsCount,
        currentPeriodStart: input.periodStart,
        currentPeriodEnd: input.periodEnd,
        startedAt: sub.startedAt ?? input.periodStart,
        ...(clearedPending
          ? {
              pendingPlanId: null,
              pendingStripePriceId: null,
              pendingChangeEffectiveAt: null,
              stripeSubscriptionScheduleId: null,
            }
          : {}),
      },
    });

    const newlyUnlockedPerks = await syncPerkGrants(tx, sub.id, snapshot, paidMonthsCount);

    return {
      handled: true,
      granted: true,
      subscriptionId: sub.id,
      userId: sub.userId,
      newlyUnlockedPerks,
      consultationCreditsGranted: snapshot.monthlyConsultationCredits,
      wellnessCreditsGranted: snapshot.wellnessCreditsPerMonth,
    };
    },
    // Snapshot capture + grant + perk sync run several sequential statements;
    // give the interactive tx headroom beyond the 5s default (esp. on a remote
    // DB). Still well under any real request budget.
    { timeout: 20_000 },
  );
}

import { Prisma, type PerkKey } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { adjustCreditsInTx, grantMonthlyCredits } from "../credits/credit-balance.service.js";
import {
  asPlanSnapshot,
  snapshotBenefitsUnlockMonths,
  type PlanSnapshot,
} from "./plan-snapshot.js";
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
 * Credits owed for the REST of the current period when upgrading mid-cycle.
 *
 * The month's grant already ran under the old plan and is period-keyed, so it
 * can't simply re-run — only the difference is issued. Pure so the arithmetic
 * that moves credits is testable without a database.
 *
 * Each side is measured through the same unlock gate the grant path applies, so
 * an upgrade can never hand out consultation credits the subscriber hasn't
 * unlocked yet. Clamped at zero: an upgrade must never claw back.
 */
export function upgradeCreditDelta(
  previous: PlanSnapshot | null,
  next: PlanSnapshot | null,
  paidMonthsCount: number,
): { consultation: number; wellness: number } {
  const entitlement = (snap: PlanSnapshot | null) => {
    if (!snap) return { consultation: 0, wellness: 0 };
    const unlocked = paidMonthsCount >= snapshotBenefitsUnlockMonths(snap);
    return {
      consultation: unlocked ? snap.monthlyConsultationCredits : 0,
      wellness: snap.wellnessCreditsPerMonth,
    };
  };
  const before = entitlement(previous);
  const after = entitlement(next);
  return {
    consultation: Math.max(0, after.consultation - before.consultation),
    wellness: Math.max(0, after.wellness - before.wellness),
  };
}

export interface PlanUpgradeResult {
  newlyUnlockedPerks: PerkKey[];
  consultationCreditsAdded: number;
  wellnessCreditsAdded: number;
}

/**
 * Apply an UPGRADE immediately, mid-period (industry norm: you get the tier you
 * just paid more for today, not at the next renewal). Downgrades keep the
 * deferred `pendingPlanId` path — the customer keeps what they already paid for
 * until the period ends.
 *
 * Tenure is preserved deliberately. `paidMonthsCount` is a property of the
 * SUBSCRIPTION, not of the plan, so it is NOT touched here: someone who unlocked
 * their perks over two paid months on Basic keeps them the moment they move to
 * Premium — they paid for those months. It is also not incremented: an upgrade
 * is not a completed billing month. The same reasoning applies to the period
 * bounds, which the next `subscription_cycle` invoice still owns.
 *
 * Credits are topped up by the DIFFERENCE only. The month's grant already
 * happened under the old plan and is period-keyed, so re-running it would be a
 * no-op — the delta is issued as an ADJUSTMENT instead, in the SAME transaction
 * as the plan swap so a subscriber can never land on the new plan without the
 * credits that come with it.
 */
export async function applyPlanUpgradeNow(input: {
  subscriptionId: string;
  newPlanId: string;
  newStripePriceId: string;
}): Promise<PlanUpgradeResult> {
  return prisma.$transaction(
    async (tx) => {
      const sub = await tx.userSubscription.findUniqueOrThrow({
        where: { id: input.subscriptionId },
      });

      const previous = asPlanSnapshot(sub.planSnapshot);
      const snapshotVersion = sub.snapshotVersion + 1;
      const snapshot = await captureSnapshot(input.newPlanId, snapshotVersion, tx);

      const {
        consultation: consultationCreditsAdded,
        wellness: wellnessCreditsAdded,
      } = upgradeCreditDelta(previous, snapshot, sub.paidMonthsCount);

      await tx.userSubscription.update({
        where: { id: sub.id },
        data: {
          planId: input.newPlanId,
          stripePriceId: input.newStripePriceId,
          planSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          snapshotVersion,
          // An immediate upgrade supersedes any scheduled change.
          pendingPlanId: null,
          pendingStripePriceId: null,
          pendingChangeEffectiveAt: null,
          stripeSubscriptionScheduleId: null,
        },
      });

      // Carried-over tenure → perks the new plan unlocks at or below the
      // months already paid flip to AUTO right now.
      const newlyUnlockedPerks = await syncPerkGrants(
        tx,
        sub.id,
        snapshot,
        sub.paidMonthsCount,
      );

      // Keyed on (sub, period, plan) so a retried upgrade tops up once.
      const periodKey = sub.currentPeriodStart?.toISOString() ?? "no-period";
      if (consultationCreditsAdded > 0) {
        await adjustCreditsInTx(tx, {
          userSubscriptionId: sub.id,
          kind: "CONSULTATION",
          delta: consultationCreditsAdded,
          reason: "ADJUSTMENT",
          idempotencyKey: `upgrade:${sub.id}:${periodKey}:${input.newPlanId}:consultation`,
        });
      }
      if (wellnessCreditsAdded > 0) {
        await adjustCreditsInTx(tx, {
          userSubscriptionId: sub.id,
          kind: "WELLNESS",
          delta: wellnessCreditsAdded,
          reason: "ADJUSTMENT",
          idempotencyKey: `upgrade:${sub.id}:${periodKey}:${input.newPlanId}:wellness`,
        });
      }

      return { newlyUnlockedPerks, consultationCreditsAdded, wellnessCreditsAdded };
    },
    { timeout: 20_000 },
  );
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

    // D25 (B3): consultation credits are withheld until benefits unlock (2nd
    // paid month by default). paidMonthsCount is 0 before this invoice, so this
    // period's count is sub.paidMonthsCount + 1. Granting 0 (rather than a
    // locked-then-wiped balance) keeps the ledger honest — a month-1 credit
    // would be reset by the month-2 grant before it could ever be used. Wellness
    // is exempt and keeps earning from the first payment.
    const nextPaidMonths = sub.paidMonthsCount + 1;
    const benefitsUnlock = snapshotBenefitsUnlockMonths(snapshot);
    const consultationCredits =
      nextPaidMonths >= benefitsUnlock ? snapshot.monthlyConsultationCredits : 0;

    const granted = await grantMonthlyCredits(tx, {
      userSubscriptionId: sub.id,
      userId: sub.userId,
      periodStart: input.periodStart,
      consultationCredits,
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

    const paidMonthsCount = nextPaidMonths;
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
      consultationCreditsGranted: consultationCredits,
      wellnessCreditsGranted: snapshot.wellnessCreditsPerMonth,
    };
    },
    // Snapshot capture + grant + perk sync run several sequential statements;
    // give the interactive tx headroom beyond the 5s default (esp. on a remote
    // DB). Still well under any real request budget.
    { timeout: 20_000 },
  );
}

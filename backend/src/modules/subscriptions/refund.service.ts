import { randomUUID } from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { recordAudit } from "../audit/audit.service.js";
import { clawbackCredits, getBalance } from "../credits/credit-balance.service.js";
import { clawbackKey } from "../credits/credit-keys.js";
import { getBillingPort } from "../billing/billing.factory.js";
import { asPlanSnapshot } from "./plan-snapshot.js";
import { emitOpsAlert } from "./ops/ops-alert.js";

/**
 * Subscription refunds (§36.5, D17/D19). Two surfaces share one reconciler:
 *   - PRE-refund policy guard (`assertRefundAllowed`) — denies a refund that
 *     breaks D17 (>7 days since the period charge, OR a consultation credit was
 *     used this period). Runs on the patient self-serve + admin "issue refund".
 *   - POST-refund reconciliation (`reconcileRefund`) — idempotent clawback of
 *     unused consultation + this-month wellness credits, CANCEL, decrement
 *     paidMonthsCount, audit, alert. Called by BOTH the refund action (fake
 *     driver / immediate) AND the `charge.refunded`/dispute webhook. A Stripe
 *     Dashboard refund bypasses the guard, so the webhook always reconciles and
 *     flags a policy violation for ops review.
 */

const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type RefundDenyCode = "NO_SUBSCRIPTION" | "NO_PAID_PERIOD" | "OUTSIDE_WINDOW" | "CREDIT_USED";

export class RefundError extends Error {
  constructor(
    public readonly code: RefundDenyCode | "PROVIDER_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "RefundError";
  }
}

type RefundableSub = {
  id: string;
  userId: string;
  status: string;
  currentPeriodStart: Date | null;
  canceledAt: Date | null;
  paidMonthsCount: number;
  planSnapshot: unknown;
  stripeSubscriptionId: string | null;
};

async function creditUsedThisPeriod(sub: Pick<RefundableSub, "id" | "currentPeriodStart">): Promise<boolean> {
  if (!sub.currentPeriodStart) return false;
  const used = await prisma.consultationCreditLedger.findFirst({
    where: { userSubscriptionId: sub.id, reason: "CONSUMED", billingPeriodStart: sub.currentPeriodStart },
    select: { id: true },
  });
  return Boolean(used);
}

/** D17 guard — throws RefundError when a refund must be denied. */
export async function assertRefundAllowed(sub: RefundableSub, now = new Date()): Promise<void> {
  if (!sub.currentPeriodStart) {
    throw new RefundError("NO_PAID_PERIOD", "No paid period to refund");
  }
  if (now.getTime() - sub.currentPeriodStart.getTime() > REFUND_WINDOW_MS) {
    throw new RefundError("OUTSIDE_WINDOW", "Refunds are only available within 7 days of the charge");
  }
  if (await creditUsedThisPeriod(sub)) {
    throw new RefundError("CREDIT_USED", "A consultation credit was used this period — not refundable");
  }
}

export interface ReconcileRefundParams {
  subscriptionId: string;
  /** Idempotency seed: Stripe event id (webhook) or `manual:{requestId}`. */
  reasonKey: string;
  source: "webhook" | "manual";
  isDispute?: boolean;
  /** Refund happened outside the 7-day window (e.g. a Stripe-Dashboard refund). */
  sevenDayBreach?: boolean;
  actorUserId?: string;
}

export interface ReconcileRefundResult {
  reconciled: boolean;
  consultationClawedBack: number;
  wellnessClawedBack: number;
  policyViolation: boolean;
}

/**
 * Idempotent post-refund reconciliation. Safe to call twice (clawback keys +
 * already-CANCELED guard make a re-run a no-op).
 */
export async function reconcileRefund(params: ReconcileRefundParams): Promise<ReconcileRefundResult> {
  const sub = (await prisma.userSubscription.findUnique({
    where: { id: params.subscriptionId },
    select: {
      id: true, userId: true, status: true, currentPeriodStart: true,
      canceledAt: true, paidMonthsCount: true, planSnapshot: true, stripeSubscriptionId: true,
    },
  })) as RefundableSub | null;
  if (!sub) {
    return { reconciled: false, consultationClawedBack: 0, wellnessClawedBack: 0, policyViolation: false };
  }

  const policyViolation = (await creditUsedThisPeriod(sub)) || Boolean(params.sevenDayBreach);
  const monthWellness = asPlanSnapshot(sub.planSnapshot)?.wellnessCreditsPerMonth ?? 0;

  // Idempotency token for the clawback keys. A refund reverses the CURRENT
  // period's benefits, so key the clawback to the period — NOT to the caller's
  // reasonKey. Both reconcilers for the SAME refund (the inline `manual:` run in
  // refundSubscription AND the `charge.refunded` webhook that Stripe fires for
  // it) then produce IDENTICAL keys, so the second run is a true no-op. Without
  // this, wellness (which is floored at `monthWellness`, not the full balance)
  // would be clawed twice, eating protected prior-month accruals (B18).
  const refundToken = sub.currentPeriodStart
    ? `refund-period:${sub.currentPeriodStart.toISOString()}`
    : `refund:${params.reasonKey}`;

  // Read balances OUTSIDE the tx (each opens its own connection — keep the
  // interactive tx short so it can't time out against a high-latency DB).
  // clawbackCredits re-floors at the live balance inside the tx, so a concurrent
  // change can only reduce what's removed, never over-claw.
  const unusedConsultation = await getBalance(sub.id, "CONSULTATION");
  const wellnessBalance = await getBalance(sub.id, "WELLNESS");
  // Reverse only THIS month's wellness earning (wellness never expires, D13 —
  // prior-month accruals stay), floored at the live balance.
  const wellnessToClaw = Math.min(monthWellness, wellnessBalance);

  let consultationClawedBack = 0;
  let wellnessClawedBack = 0;

  await prisma.$transaction(
    async (tx) => {
      if (unusedConsultation > 0) {
        // `applied` is false when this key was already clawed (a prior run for
        // the same refund) — only then do we count/audit it, so a re-run reports
        // 0 rather than a phantom clawback.
        const applied = await clawbackCredits(tx, {
          userSubscriptionId: sub.id,
          userId: sub.userId,
          kind: "CONSULTATION",
          amount: unusedConsultation,
          idempotencyKey: clawbackKey(sub.id, refundToken, "CONSULTATION"),
        });
        if (applied) consultationClawedBack = unusedConsultation;
      }
      if (wellnessToClaw > 0) {
        const applied = await clawbackCredits(tx, {
          userSubscriptionId: sub.id,
          userId: sub.userId,
          kind: "WELLNESS",
          amount: wellnessToClaw,
          idempotencyKey: clawbackKey(sub.id, refundToken, "WELLNESS"),
        });
        if (applied) wellnessClawedBack = wellnessToClaw;
      }
      if (sub.status !== "CANCELED") {
        await tx.userSubscription.update({
          where: { id: sub.id },
          data: {
            status: "CANCELED",
            canceledAt: sub.canceledAt ?? new Date(),
            paidMonthsCount: Math.max(0, sub.paidMonthsCount - 1),
          },
        });
      }
    },
    { timeout: 15000 },
  );

  void recordAudit({
    action: params.isDispute ? "SUBSCRIPTION_UPDATED" : "SUBSCRIPTION_REFUNDED",
    entityType: "UserSubscription",
    entityId: sub.id,
    actorUserId: params.actorUserId ?? sub.userId,
    metadata: {
      source: params.source,
      isDispute: Boolean(params.isDispute),
      policyViolation,
      sevenDayBreach: Boolean(params.sevenDayBreach),
      flaggedForReview: Boolean(params.isDispute) || policyViolation,
      consultationClawedBack,
      wellnessClawedBack,
    },
  });
  if (consultationClawedBack > 0) {
    void recordAudit({ action: "CONSULTATION_CREDIT_CLAWED_BACK", entityType: "UserSubscription", entityId: sub.id, actorUserId: params.actorUserId ?? sub.userId, metadata: { amount: consultationClawedBack, source: params.source } });
  }
  if (wellnessClawedBack > 0) {
    void recordAudit({ action: "WELLNESS_CREDIT_CLAWED_BACK", entityType: "UserSubscription", entityId: sub.id, actorUserId: params.actorUserId ?? sub.userId, metadata: { amount: wellnessClawedBack, source: params.source } });
  }

  if (params.isDispute || policyViolation) {
    void emitOpsAlert({
      severity: params.isDispute ? "critical" : "warning",
      title: params.isDispute ? "Subscription chargeback/dispute" : "Refund policy violation",
      detail: `sub ${sub.id} — ${params.isDispute ? "dispute" : "refund"} reconciled; review required`,
      context: { subscriptionId: sub.id, policyViolation, sevenDayBreach: Boolean(params.sevenDayBreach) },
    });
  }

  return { reconciled: true, consultationClawedBack, wellnessClawedBack, policyViolation };
}

export interface RefundSubscriptionInput {
  subscriptionId?: string;
  userId?: string;
  actorUserId: string | null;
  requestId?: string;
}

/**
 * Issue a refund (admin or patient self-serve). Runs the D17 guard FIRST (denies
 * if outside window / credit used), then refunds at the provider, then reconciles
 * immediately (idempotent — a later `charge.refunded` webhook is a no-op).
 */
export async function refundSubscription(input: RefundSubscriptionInput): Promise<ReconcileRefundResult> {
  const sub = (await prisma.userSubscription.findFirst({
    where: input.subscriptionId
      ? { id: input.subscriptionId }
      : { userId: input.userId, currentPeriodStart: { not: null } },
    orderBy: { currentPeriodStart: "desc" },
    select: {
      id: true, userId: true, status: true, currentPeriodStart: true,
      canceledAt: true, paidMonthsCount: true, planSnapshot: true, stripeSubscriptionId: true,
    },
  })) as RefundableSub | null;
  if (!sub) throw new RefundError("NO_SUBSCRIPTION", "No subscription to refund");

  await assertRefundAllowed(sub);

  const billing = getBillingPort();
  if (billing.driver === "stripe" && sub.stripeSubscriptionId) {
    try {
      await billing.refundLatestPayment(sub.stripeSubscriptionId);
    } catch (err) {
      throw new RefundError("PROVIDER_FAILED", err instanceof Error ? err.message : "Provider refund failed");
    }
  }

  return reconcileRefund({
    subscriptionId: sub.id,
    reasonKey: `manual:${input.requestId ?? randomUUID()}`,
    source: "manual",
    actorUserId: input.actorUserId ?? undefined,
  });
}

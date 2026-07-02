import { Prisma, type SubscriptionStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { adjustCredits, adjustmentKey } from "../credits/credit-balance.service.js";
import { getCreditsView } from "../credits/credits-read.service.js";
import { recordAudit } from "../audit/audit.service.js";
import { getBillingPort } from "../billing/billing.factory.js";
import type { BillingSubscriptionView } from "../billing/billing.types.js";
import {
  handleSubscriptionEvent,
  type MinimalStripeEvent,
} from "../subscriptions/subscription-webhook.service.js";
import { processInvoicePaid } from "../subscriptions/subscription-grant.service.js";
import { asPlanSnapshot } from "../subscriptions/plan-snapshot.js";
import type { AdminSubscriptionsQuery } from "../../validations/admin-plans.schema.js";

export class SubscriptionNotFoundError extends Error {
  constructor() {
    super("Subscription not found");
    this.name = "SubscriptionNotFoundError";
  }
}

const adminSubscriptionInclude = {
  user: { select: { id: true, email: true, fullName: true } },
  plan: { select: { id: true, name: true, slug: true, countryId: true } },
  balances: { select: { kind: true, balance: true } },
} satisfies Prisma.UserSubscriptionInclude;

export type AdminSubscriptionRecord = Prisma.UserSubscriptionGetPayload<{
  include: typeof adminSubscriptionInclude;
}>;

export type ListAdminSubscriptionsResult = {
  items: AdminSubscriptionRecord[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export async function listAdminSubscriptions(
  query: AdminSubscriptionsQuery,
): Promise<ListAdminSubscriptionsResult> {
  const where: Prisma.UserSubscriptionWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.planId) where.planId = query.planId;
  // Country codes are stored lowercase (Sprint 1 gotcha) — compare lowercased.
  if (query.countryCode) where.countryCode = query.countryCode.toLowerCase();

  const page = Math.max(1, query.page);
  const pageSize = Math.min(100, Math.max(1, query.pageSize));

  try {
    const total = await prisma.userSubscription.count({ where });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const effectivePage = totalPages === 0 ? page : Math.min(page, totalPages);
    const items = await prisma.userSubscription.findMany({
      where,
      skip: (effectivePage - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: adminSubscriptionInclude,
    });
    return { items, pagination: { page: effectivePage, pageSize, total, totalPages } };
  } catch (error) {
    throw normalizeDbError(error, "Subscriptions data is unavailable");
  }
}

/**
 * Recent credit-ledger entries for one subscription (§4d admin provenance).
 * Reuses the patient credits read model so the admin sees the same merged
 * consultation + wellness history (earned / reset / reserved / consumed /
 * redeemed / released / manually adjusted / clawed back).
 */
export async function getAdminSubscriptionLedger(
  subscriptionId: string,
): Promise<{ ledger: Awaited<ReturnType<typeof getCreditsView>>["ledger"] }> {
  const sub = await prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, currentPeriodStart: true },
  });
  if (!sub) throw new SubscriptionNotFoundError();
  const view = await getCreditsView(sub.id, sub.currentPeriodStart);
  return { ledger: view.ledger };
}

export type AdminAdjustCreditsInput = {
  subscriptionId: string;
  kind: "CONSULTATION" | "WELLNESS";
  delta: number;
  reason: "ADJUSTMENT" | "CLAWBACK";
  requestId: string;
  actorAdminId: string | null;
};

/**
 * Manual admin credit grant/clawback (§36.15). Delegates to Sprint 1's credit
 * counter so the balance stays authoritative; idempotent via the
 * `admin:{adminId}:{requestId}` key. The route writes the audit row.
 */
export async function adminAdjustSubscriptionCredits(
  input: AdminAdjustCreditsInput,
): Promise<{ balance: number }> {
  const sub = await prisma.userSubscription.findUnique({
    where: { id: input.subscriptionId },
    select: { id: true },
  });
  if (!sub) throw new SubscriptionNotFoundError();

  const actorId = input.actorAdminId ?? "token-admin";
  return adjustCredits({
    userSubscriptionId: input.subscriptionId,
    kind: input.kind,
    delta: input.delta,
    reason: input.reason,
    idempotencyKey: adjustmentKey(actorId, input.requestId),
    actorAdminId: actorId,
  });
}

// ── Admin repair endpoints (§6.4) ─────────────────────────────────────────────

/**
 * Result of an admin resync. `outcome` distinguishes:
 *   - "SYNCED"      — provider row fetched and our row reconciled (monotonic).
 *   - "NO_PROVIDER" — the sub has never been linked to a provider subscription.
 *   - "DRIFT"       — the provider returned null (sub missing at provider).
 */
export type ResyncResult =
  | { outcome: "SYNCED"; status: SubscriptionStatus; currentPeriodEnd: Date | null }
  | { outcome: "NO_PROVIDER" }
  | { outcome: "DRIFT" };

/**
 * Map our BillingSubscriptionView status back to the Stripe status strings the
 * webhook handler's `mapStripeStatus` expects, so the synthetic event runs the
 * IDENTICAL monotonic guard logic as a live `customer.subscription.updated`.
 */
function toStripeStatusString(status: BillingSubscriptionView["status"]): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "paused":
      return "paused";
    case "incomplete":
    default:
      return "incomplete";
  }
}

function dateToUnix(value: Date | null): number | undefined {
  return value ? Math.floor(value.getTime() / 1000) : undefined;
}

/**
 * Fetch the live provider subscription and monotonically reconcile status +
 * period into our row (§6.4). Reuses the webhook handler by posting a synthetic
 * `customer.subscription.updated` event built from the provider view — this
 * guarantees the SAME guards apply as a live webhook: never resurrect a CANCELED
 * sub, never rewind currentPeriodStart, never downgrade ACTIVE→INCOMPLETE.
 */
export async function resyncSubscription(
  subscriptionId: string,
  actorUserId: string | null,
): Promise<ResyncResult> {
  const sub = await prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, userId: true, stripeSubscriptionId: true },
  });
  if (!sub) throw new SubscriptionNotFoundError();
  if (!sub.stripeSubscriptionId) return { outcome: "NO_PROVIDER" };

  const view = await getBillingPort().retrieveSubscription(sub.stripeSubscriptionId);
  if (!view) return { outcome: "DRIFT" };

  const event: MinimalStripeEvent = {
    // Non-webhook synthetic id: never collides with a real Stripe event id, so
    // the ProcessedWebhookEvent dedupe never suppresses a genuine live event.
    id: `admin-resync:${sub.stripeSubscriptionId}:${Date.now()}`,
    type: "customer.subscription.updated",
    data: {
      object: {
        id: view.id,
        status: toStripeStatusString(view.status),
        cancel_at_period_end: view.cancelAtPeriodEnd,
        current_period_start: dateToUnix(view.currentPeriodStart),
        current_period_end: dateToUnix(view.currentPeriodEnd),
      },
    },
  };
  await handleSubscriptionEvent(event);

  // Re-read the reconciled row so we report what actually persisted after the
  // monotonic guards (the guards may have left the row unchanged).
  const after = await prisma.userSubscription.findUnique({
    where: { id: sub.id },
    select: { status: true, currentPeriodEnd: true },
  });

  await recordAudit({
    action: "SUBSCRIPTION_UPDATED",
    entityType: "UserSubscription",
    entityId: sub.id,
    actorUserId,
    metadata: {
      via: "admin_resync",
      providerStatus: view.status,
      appliedStatus: after?.status ?? null,
    },
  });

  return {
    outcome: "SYNCED",
    status: after?.status ?? "INCOMPLETE",
    currentPeriodEnd: after?.currentPeriodEnd ?? null,
  };
}

/**
 * Result of a regrant. `outcome`:
 *   - "REGRANTED"      — the current period's grant was re-run (may be a no-op).
 *   - "NOT_APPLICABLE" — the sub lacks the provider id or a bounded period.
 */
export type RegrantResult =
  | { outcome: "REGRANTED"; granted: boolean; reason: string }
  | { outcome: "NOT_APPLICABLE"; reason: string };

/**
 * Re-run the current period's credit grant (§6.4). Idempotent via the period
 * grant key inside `processInvoicePaid` — a no-op (`granted:false`) if the
 * period was already granted. Uses the snapshot's monthly price as the paid
 * amount (falling back to 1) so the €0-invoice guard doesn't short-circuit it.
 */
export async function regrantCurrentPeriod(
  subscriptionId: string,
  actorUserId: string | null,
): Promise<RegrantResult> {
  const sub = await prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
    select: {
      id: true,
      stripeSubscriptionId: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      planSnapshot: true,
    },
  });
  if (!sub) throw new SubscriptionNotFoundError();
  if (!sub.stripeSubscriptionId) {
    return { outcome: "NOT_APPLICABLE", reason: "NO_PROVIDER" };
  }
  if (!sub.currentPeriodStart || !sub.currentPeriodEnd) {
    return { outcome: "NOT_APPLICABLE", reason: "NO_PERIOD" };
  }

  const snapshot = asPlanSnapshot(sub.planSnapshot);
  const amountPaid = snapshot && snapshot.monthlyPriceCents > 0 ? snapshot.monthlyPriceCents : 1;

  const grant = await processInvoicePaid({
    stripeSubscriptionId: sub.stripeSubscriptionId,
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
    billingReason: "subscription_cycle",
    amountPaid,
  });

  await recordAudit({
    action: "SUBSCRIPTION_UPDATED",
    entityType: "UserSubscription",
    entityId: sub.id,
    actorUserId,
    metadata: { via: "admin_regrant", granted: grant.granted },
  });

  return {
    outcome: "REGRANTED",
    granted: grant.granted,
    reason: grant.granted ? "granted" : "already_granted",
  };
}

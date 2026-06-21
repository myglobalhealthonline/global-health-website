import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { adjustCredits, adjustmentKey } from "../credits/credit-balance.service.js";
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

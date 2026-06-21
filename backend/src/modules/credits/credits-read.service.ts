import { prisma } from "../../db/prisma.js";
import { getBalance } from "./credit-balance.service.js";

/**
 * Credit balances + ledger history for GET /api/me/credits (contracts.md).
 * Balances come from the counter (sole authority, §36.1) — never the ledger sum.
 */

export interface CreditsView {
  consultation: { balance: number; usedThisPeriod: number };
  wellness: { balance: number };
  ledger: Array<{
    kind: "CONSULTATION" | "WELLNESS";
    deltaCredits: number;
    reason: string;
    createdAt: string;
  }>;
}

export async function getCreditsView(
  subscriptionId: string,
  currentPeriodStart: Date | null,
  limit = 50,
): Promise<CreditsView> {
  const [consultationBalance, wellnessBalance, usedThisPeriod, ledger] = await Promise.all([
    getBalance(subscriptionId, "CONSULTATION"),
    getBalance(subscriptionId, "WELLNESS"),
    computeUsedThisPeriod(subscriptionId, currentPeriodStart),
    loadLedger(subscriptionId, limit),
  ]);

  return {
    consultation: { balance: consultationBalance, usedThisPeriod },
    wellness: { balance: wellnessBalance },
    ledger,
  };
}

/**
 * Credits consumed this period = sum of reserved amounts whose reservation was
 * committed (has a CONSUMED terminal), scoped to the current billing period.
 */
async function computeUsedThisPeriod(
  subscriptionId: string,
  periodStart: Date | null,
): Promise<number> {
  if (!periodStart) return 0;
  const reserved = await prisma.consultationCreditLedger.findMany({
    where: {
      userSubscriptionId: subscriptionId,
      reason: "RESERVED",
      billingPeriodStart: periodStart,
    },
    select: { reservationId: true, deltaCredits: true },
  });
  if (reserved.length === 0) return 0;
  const reservationIds = reserved
    .map((r) => r.reservationId)
    .filter((id): id is string => Boolean(id));
  const committed = await prisma.consultationCreditLedger.findMany({
    where: { reservationId: { in: reservationIds }, reason: "CONSUMED" },
    select: { reservationId: true },
  });
  const committedIds = new Set(committed.map((c) => c.reservationId));
  return reserved
    .filter((r) => r.reservationId && committedIds.has(r.reservationId))
    .reduce((sum, r) => sum + Math.abs(r.deltaCredits), 0);
}

async function loadLedger(
  subscriptionId: string,
  limit: number,
): Promise<CreditsView["ledger"]> {
  const [consultation, wellness] = await Promise.all([
    prisma.consultationCreditLedger.findMany({
      where: { userSubscriptionId: subscriptionId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { deltaCredits: true, reason: true, createdAt: true },
    }),
    prisma.wellnessCreditLedger.findMany({
      where: { userSubscriptionId: subscriptionId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { deltaCredits: true, reason: true, createdAt: true },
    }),
  ]);
  const merged = [
    ...consultation.map((r) => ({
      kind: "CONSULTATION" as const,
      deltaCredits: r.deltaCredits,
      reason: r.reason as string,
      createdAt: r.createdAt.toISOString(),
    })),
    ...wellness.map((r) => ({
      kind: "WELLNESS" as const,
      deltaCredits: r.deltaCredits,
      reason: r.reason as string,
      createdAt: r.createdAt.toISOString(),
    })),
  ];
  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return merged.slice(0, limit);
}

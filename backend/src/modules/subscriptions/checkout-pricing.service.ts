import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { recordAudit } from "../audit/audit.service.js";
import { commitReservation, releaseReservation, reserveCredits } from "../credits/credit-balance.service.js";
import { asPlanSnapshot } from "./plan-snapshot.js";
import { resolveConsultationPrice } from "./pricing-resolver.js";
import { isBenefitEligible } from "./subscription-eligibility.js";

/**
 * Checkout pricing-engine integration (§21). Applies subscription pricing to
 * consultation cart lines INSIDE the order transaction: credit → €0 (atomic
 * reserve), fixed, percent (rounded), or normal. PRESCRIPTION is never plan-
 * priced (§36.11). Commit happens on payment success OR €0-order confirm
 * (§36.3); release on abandon (sweep / expiry).
 */

const RESERVE_TTL_MS = 15 * 60 * 1000;

export interface CheckoutCartItem {
  id: string;
  kind: string;
  serviceId: string | null;
  unitPriceCents: number;
}

export interface PlanLine {
  finalUnitPriceCents: number;
  creditCovered: boolean;
  reservationId?: string;
}

export interface ApplyPricingResult {
  subscriptionId: string | null;
  lines: Map<string, PlanLine>;
}

const CONSULTATION_KINDS = new Set(["GENERAL_CONSULTATION", "SPECIALIST_CONSULTATION"]);

/**
 * Resolve + reserve plan pricing for a cart's consultation lines. Must run
 * inside the order-creation transaction so reservations roll back with the
 * order. Non-consultation / non-covered lines are absent from `lines` (caller
 * keeps the peak price).
 */
export async function reserveAndPriceConsultations(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    countryCode: string;
    items: CheckoutCartItem[];
    peakPriceByItemId: Map<string, number>;
    now?: Date;
  },
): Promise<ApplyPricingResult> {
  const now = input.now ?? new Date();
  const lines = new Map<string, PlanLine>();

  const sub = await tx.userSubscription.findFirst({
    where: {
      userId: input.userId,
      countryCode: input.countryCode,
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (
    !sub ||
    !isBenefitEligible({
      status: sub.status,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      currentPeriodEnd: sub.currentPeriodEnd,
      now,
    })
  ) {
    return { subscriptionId: null, lines };
  }

  const snapshot = asPlanSnapshot(sub.planSnapshot);
  if (!snapshot) return { subscriptionId: sub.id, lines };

  // Local mirror of the live consultation counter so two credit lines in the
  // same cart don't both attempt to spend the last credit.
  const balanceRow = await tx.subscriptionCreditBalance.findUnique({
    where: { userSubscriptionId_kind: { userSubscriptionId: sub.id, kind: "CONSULTATION" } },
  });
  let creditsAvailable = balanceRow?.balance ?? 0;

  for (const item of input.items) {
    // PRESCRIPTION + non-consultation lines are never plan-priced (§36.11).
    if (!CONSULTATION_KINDS.has(item.kind) || !item.serviceId) continue;
    const rule = snapshot.consultationRules.find((r) => r.serviceId === item.serviceId) ?? null;
    if (!rule) continue;

    const basePriceCents = input.peakPriceByItemId.get(item.id) ?? item.unitPriceCents;
    const resolved = resolveConsultationPrice({
      rule,
      basePriceCents,
      creditsAvailable,
      paidMonthsCount: sub.paidMonthsCount,
    });

    if (resolved.mode === "CREDIT") {
      const reservationId = randomUUID();
      const ok = await reserveCredits(tx, {
        userSubscriptionId: sub.id,
        userId: input.userId,
        kind: "CONSULTATION",
        amount: resolved.creditsToReserve,
        reservationId,
        reservedUntil: new Date(now.getTime() + RESERVE_TTL_MS),
        serviceId: item.serviceId,
        billingPeriodStart: sub.currentPeriodStart,
      });
      if (ok) {
        creditsAvailable -= resolved.creditsToReserve;
        lines.set(item.id, { finalUnitPriceCents: 0, creditCovered: true, reservationId });
        continue;
      }
      // Lost the race — fall back to discount/normal (no credit).
      const fallback = resolveConsultationPrice({
        rule,
        basePriceCents,
        creditsAvailable: 0,
        paidMonthsCount: sub.paidMonthsCount,
      });
      lines.set(item.id, { finalUnitPriceCents: fallback.unitPriceCents, creditCovered: false });
      continue;
    }

    lines.set(item.id, { finalUnitPriceCents: resolved.unitPriceCents, creditCovered: false });
  }

  return { subscriptionId: sub.id, lines };
}

/** After order.create, link each RESERVED row to its OrderItem (for commit). */
export async function linkReservationsToOrderItems(
  tx: Prisma.TransactionClient,
  lines: Map<string, PlanLine>,
  cartItemToOrderItemId: Map<string, string>,
): Promise<void> {
  for (const [cartItemId, line] of lines) {
    if (!line.reservationId) continue;
    const orderItemId = cartItemToOrderItemId.get(cartItemId);
    if (!orderItemId) continue;
    await tx.consultationCreditLedger.updateMany({
      where: { reservationId: line.reservationId, reason: "RESERVED" },
      data: { orderItemId },
    });
  }
}

/** Commit all consultation reservations for an order (payment / €0 confirm). */
export async function commitOrderCreditReservations(orderId: string): Promise<void> {
  const rows = await loadOrderReservations(orderId);
  for (const row of rows) {
    await prisma.$transaction((tx) =>
      commitReservation(tx, {
        userSubscriptionId: row.userSubscriptionId,
        userId: row.userId,
        kind: "CONSULTATION",
        amount: Math.abs(row.deltaCredits),
        reservationId: row.reservationId!,
      }),
    );
    void recordAudit({
      action: "CONSULTATION_CREDIT_CONSUMED",
      entityType: "Order",
      entityId: orderId,
      actorUserId: row.userId,
      metadata: { reservationId: row.reservationId },
    });
  }
}

/** Release all consultation reservations for an abandoned/expired order. */
export async function releaseOrderCreditReservations(orderId: string): Promise<void> {
  const rows = await loadOrderReservations(orderId);
  for (const row of rows) {
    await prisma.$transaction((tx) =>
      releaseReservation(tx, {
        userSubscriptionId: row.userSubscriptionId,
        userId: row.userId,
        kind: "CONSULTATION",
        amount: Math.abs(row.deltaCredits),
        reservationId: row.reservationId!,
      }),
    );
  }
}

async function loadOrderReservations(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);
  if (itemIds.length === 0) return [];
  return prisma.consultationCreditLedger.findMany({
    where: { orderItemId: { in: itemIds }, reason: "RESERVED", reservationId: { not: null } },
    select: { reservationId: true, userSubscriptionId: true, userId: true, deltaCredits: true },
  });
}

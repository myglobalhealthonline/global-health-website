import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { getStripeClient, isStripeConfigured } from "../../lib/stripe/client.js";
import { generateOrderNumber } from "../../lib/order-number.js";
import { recordAudit } from "../audit/audit.service.js";
import {
  commitReservation,
  getBalance,
  releaseReservation,
  reserveCredits,
} from "../credits/credit-balance.service.js";
import { asPlanSnapshot } from "./plan-snapshot.js";
import { isPerkUnlocked } from "./pricing-resolver.js";
import { isRedemptionEligible } from "./subscription-eligibility.js";
import { notifyRedemptionConfirmed } from "./subscription-emails.service.js";

/**
 * Wellness-credit health-kit redemption (§11). Shipping-only paid checkout:
 * the kit line is €0 (covered by credits), postage rides in Order.shippingCents.
 * Mirrors the consultation reserve/commit pattern — reserve credits + stock at
 * checkout, commit on shipping-payment success (or instantly if shippingCents=0),
 * release on abandon.
 */

const RESERVE_TTL_MS = 15 * 60 * 1000;

export type RedemptionErrorCode =
  | "NO_ACTIVE_SUBSCRIPTION"
  | "NOT_ELIGIBLE"
  | "INSUFFICIENT_CREDITS"
  | "OUT_OF_STOCK"
  | "NOT_REDEEMABLE";

export class RedemptionError extends Error {
  constructor(
    public code: RedemptionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RedemptionError";
  }
}

export interface RedemptionKitView {
  healthTestId: string;
  name: string;
  requiredWellnessCredits: number;
  progress: number;
  eligible: boolean;
  reason?: RedemptionErrorCode;
}

/** List eligible kits + progress for the patient's current subscription. */
export async function listRedemptions(userId: string): Promise<{ kits: RedemptionKitView[] }> {
  const sub = await currentSubscription(userId);
  if (!sub) return { kits: [] };
  const snapshot = asPlanSnapshot(sub.planSnapshot);
  if (!snapshot || snapshot.healthTestRules.length === 0) return { kits: [] };

  const wellnessBalance = await getBalance(sub.id, "WELLNESS");
  const now = new Date();
  const redemptionEligible = isRedemptionEligible({
    status: sub.status,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd,
    now,
  });
  const perkRule = snapshot.perkRules.find(
    (p) => p.perkKey === "TEST_KIT_REDEMPTION" || p.perkKey === "WELLNESS_REDEMPTION",
  );
  const perkUnlocked = perkRule
    ? isPerkUnlocked(perkRule, sub.paidMonthsCount)
    : true;

  const kits = await prisma.healthTest.findMany({
    where: { id: { in: snapshot.healthTestRules.map((r) => r.healthTestId) } },
    select: { id: true, title: true, stock: true },
  });
  const kitById = new Map(kits.map((k) => [k.id, k]));

  const views: RedemptionKitView[] = snapshot.healthTestRules.map((rule) => {
    const kit = kitById.get(rule.healthTestId);
    const required = rule.requiredWellnessCredits;
    const progress = required > 0 ? Math.min(1, wellnessBalance / required) : 1;
    let eligible = true;
    let reason: RedemptionErrorCode | undefined;
    if (!redemptionEligible) {
      eligible = false;
      reason = "NOT_ELIGIBLE";
    } else if (!perkUnlocked || !isPerkUnlocked({ unlockMode: "AFTER_PAID_MONTHS", unlockAfterPaidMonths: rule.unlockAfterPaidMonths }, sub.paidMonthsCount)) {
      eligible = false;
      reason = "NOT_ELIGIBLE";
    } else if (wellnessBalance < required) {
      eligible = false;
      reason = "INSUFFICIENT_CREDITS";
    } else if (kit?.stock === 0) {
      eligible = false;
      reason = "OUT_OF_STOCK";
    }
    return {
      healthTestId: rule.healthTestId,
      name: kit?.title ?? "Health test kit",
      requiredWellnessCredits: required,
      progress,
      eligible,
      ...(reason ? { reason } : {}),
    };
  });

  return { kits: views };
}

export interface StartRedemptionInput {
  userId: string;
  email: string;
  fullName: string;
  healthTestId: string;
  ship: {
    name: string;
    line1: string;
    line2?: string | null;
    city: string;
    postalCode: string;
    countryCode: string;
  };
  returnTo?: string;
}

export interface StartRedemptionResult {
  redemptionId: string;
  checkoutUrl?: string;
  status: "REQUESTED" | "APPROVED";
}

/**
 * Reserve wellness credits + stock, create the redemption + a shipping-only
 * Order, and return the shipping Checkout URL (or commit instantly when postage
 * is €0). All reservation work happens in one transaction (§36.6).
 */
export async function startRedemption(
  input: StartRedemptionInput,
): Promise<StartRedemptionResult> {
  const sub = await currentSubscription(input.userId);
  if (!sub) throw new RedemptionError("NO_ACTIVE_SUBSCRIPTION", "No active subscription");

  const snapshot = asPlanSnapshot(sub.planSnapshot);
  const rule = snapshot?.healthTestRules.find((r) => r.healthTestId === input.healthTestId);
  if (!snapshot || !rule) {
    throw new RedemptionError("NOT_REDEEMABLE", "Kit is not redeemable on this plan");
  }

  const now = new Date();
  if (
    !isRedemptionEligible({
      status: sub.status,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      currentPeriodEnd: sub.currentPeriodEnd,
      now,
    })
  ) {
    throw new RedemptionError("NOT_ELIGIBLE", "Subscription not active");
  }
  if (
    !isPerkUnlocked(
      { unlockMode: "AFTER_PAID_MONTHS", unlockAfterPaidMonths: rule.unlockAfterPaidMonths },
      sub.paidMonthsCount,
    )
  ) {
    throw new RedemptionError("NOT_ELIGIBLE", "Redemption not yet unlocked");
  }

  const kit = await prisma.healthTest.findUnique({ where: { id: input.healthTestId } });
  if (!kit) throw new RedemptionError("NOT_REDEEMABLE", "Kit not found");
  if (kit.stock === 0) throw new RedemptionError("OUT_OF_STOCK", "Out of stock");

  const shippingCents = kit.shippingCents ?? 0;
  const orderNumber = await generateOrderNumber();
  const reservedUntil = new Date(now.getTime() + RESERVE_TTL_MS);

  const created = await prisma.$transaction(
    async (tx) => {
    // 1. Reserve stock (only when finite). 0 already rejected above.
    if (kit.stock != null) {
      const stockDec = await tx.healthTest.updateMany({
        where: { id: kit.id, stock: { gte: 1 } },
        data: { stock: { decrement: 1 } },
      });
      if (stockDec.count === 0) {
        throw new RedemptionError("OUT_OF_STOCK", "Out of stock");
      }
    }

    // 2. Create the redemption (REQUESTED). reservationId for the wellness
    //    ledger == redemption.id (§20).
    const redemption = await tx.healthTestRedemption.create({
      data: {
        userId: input.userId,
        userSubscriptionId: sub.id,
        healthTestId: kit.id,
        wellnessCreditsSpent: rule.requiredWellnessCredits,
        status: "REQUESTED",
      },
    });

    // 3. Reserve wellness credits atomically.
    const reserved = await reserveCredits(tx, {
      userSubscriptionId: sub.id,
      userId: input.userId,
      kind: "WELLNESS",
      amount: rule.requiredWellnessCredits,
      reservationId: redemption.id,
      reservedUntil,
      healthTestId: kit.id,
      redemptionId: redemption.id,
    });
    if (!reserved) {
      throw new RedemptionError("INSUFFICIENT_CREDITS", "Not enough wellness credits");
    }

    // 4. Create the shipping-only Order (€0 kit line + postage in shippingCents).
    const order = await tx.order.create({
      data: {
        orderNumber,
        userId: input.userId,
        email: input.email,
        fullName: input.fullName,
        countryCode: sub.countryCode,
        currencyCode: kit.currencyCode,
        subtotalCents: 0,
        shippingCents,
        totalCents: shippingCents,
        paymentStatus: shippingCents > 0 ? "PENDING" : "PAID",
        paidAt: shippingCents > 0 ? null : now,
        shipName: input.ship.name,
        shipLine1: input.ship.line1,
        shipLine2: input.ship.line2 ?? null,
        shipCity: input.ship.city,
        shipPostalCode: input.ship.postalCode,
        shipCountryCode: input.ship.countryCode.toUpperCase(),
        items: {
          create: [
            {
              kind: "HEALTH_TEST",
              healthTestId: kit.id,
              name: kit.title,
              unitPriceCents: 0,
              quantity: 1,
              lineTotalCents: 0,
            },
          ],
        },
      },
    });

    await tx.healthTestRedemption.update({
      where: { id: redemption.id },
      data: { orderId: order.id },
    });

    return { redemption, order };
    },
    { timeout: 20_000 },
  );

  // 5a. €0 postage → commit immediately (no Stripe payment, §11).
  if (shippingCents === 0) {
    await commitRedemption(created.redemption.id);
    return { redemptionId: created.redemption.id, status: "APPROVED" };
  }

  // 5b. Paid postage → Stripe Checkout for the shipping amount.
  if (!isStripeConfigured()) {
    // Without Stripe we can't collect postage; release and surface the error.
    await releaseRedemption(created.redemption.id);
    throw new RedemptionError("NOT_REDEEMABLE", "Shipping payment is not configured");
  }
  const base = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
  const ret = input.returnTo ?? "/account";
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: input.email,
    client_reference_id: created.order.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: kit.currencyCode.toLowerCase(),
          unit_amount: shippingCents,
          product_data: { name: `Shipping — ${kit.title}` },
        },
      },
    ],
    success_url: `${base}${ret}?redemption=ok`,
    cancel_url: `${base}${ret}?redemption=cancelled`,
    metadata: { kind: "redemption", redemptionId: created.redemption.id, orderId: created.order.id },
  });
  await prisma.order.update({
    where: { id: created.order.id },
    data: { stripeSessionId: session.id, stripeCheckoutUrl: session.url ?? null },
  });

  return {
    redemptionId: created.redemption.id,
    checkoutUrl: session.url ?? undefined,
    status: "REQUESTED",
  };
}

/** Commit on shipping payment success (or instant €0). Idempotent. */
export async function commitRedemption(redemptionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const redemption = await tx.healthTestRedemption.findUnique({
      where: { id: redemptionId },
    });
    if (!redemption) return;

    const terminal = await commitReservation(tx, {
      userSubscriptionId: redemption.userSubscriptionId,
      userId: redemption.userId,
      kind: "WELLNESS",
      amount: redemption.wellnessCreditsSpent,
      reservationId: redemption.id,
    });
    // already_released means the sweep beat the payment — leave as canceled.
    if (terminal === "already_released") return;

    if (redemption.status === "REQUESTED") {
      await tx.healthTestRedemption.update({
        where: { id: redemption.id },
        data: { status: "APPROVED" },
      });
    }
    if (redemption.orderId) {
      await tx.order.update({
        where: { id: redemption.orderId },
        data: { paymentStatus: "PAID", paidAt: new Date() },
      });
    }
  });

  const redemption = await prisma.healthTestRedemption.findUnique({
    where: { id: redemptionId },
    select: { userId: true, healthTestId: true, wellnessCreditsSpent: true },
  });
  if (redemption) {
    void recordAudit({
      action: "WELLNESS_CREDIT_REDEEMED",
      entityType: "HealthTestRedemption",
      entityId: redemptionId,
      actorUserId: redemption.userId,
      metadata: { healthTestId: redemption.healthTestId, credits: redemption.wellnessCreditsSpent },
    });
    void recordAudit({
      action: "HEALTH_TEST_REDEEMED",
      entityType: "HealthTestRedemption",
      entityId: redemptionId,
      actorUserId: redemption.userId,
      metadata: { healthTestId: redemption.healthTestId },
    });
    // Redemption confirmation email (§30) — fire-and-forget.
    void notifyRedemptionConfirmed(redemptionId);
  }
}

/** Release on abandon/expiry: restore credits + stock, cancel order/redemption. */
export async function releaseRedemption(redemptionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const redemption = await tx.healthTestRedemption.findUnique({
      where: { id: redemptionId },
    });
    if (!redemption || redemption.status !== "REQUESTED") return;

    const terminal = await releaseReservation(tx, {
      userSubscriptionId: redemption.userSubscriptionId,
      userId: redemption.userId,
      kind: "WELLNESS",
      amount: redemption.wellnessCreditsSpent,
      reservationId: redemption.id,
    });
    if (terminal === "already_committed") return; // payment landed first.

    // Restore reserved stock (only when finite).
    await tx.healthTest.updateMany({
      where: { id: redemption.healthTestId, stock: { not: null } },
      data: { stock: { increment: 1 } },
    });
    await tx.healthTestRedemption.update({
      where: { id: redemption.id },
      data: { status: "CANCELED" },
    });
    if (redemption.orderId) {
      await tx.order.update({
        where: { id: redemption.orderId },
        data: { status: "CANCELLED" },
      });
    }
  });
}

async function currentSubscription(userId: string) {
  return prisma.userSubscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "PAST_DUE", "CANCELED"] } },
    orderBy: { createdAt: "desc" },
  });
}

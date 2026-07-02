import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { recordAudit } from "../audit/audit.service.js";
import { commitReservation, releaseReservation, reserveCredits } from "../credits/credit-balance.service.js";
import {
  asPlanSnapshot,
  snapshotBenefitsUnlockMonths,
  type SnapshotConsultationRule,
} from "./plan-snapshot.js";
import {
  eligibleBenefitSelections,
  resolveConsultationPrice,
  type BenefitSelection,
  type CoverageReason,
  type PriceMode,
} from "./pricing-resolver.js";
import {
  resolveFamilyEligibility,
  type FamilyIneligibleReason,
} from "./family-eligibility.js";
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
  /** Per-line benefit choice. Defaults to PAY_NORMAL when absent (never reserves). */
  benefitSelection?: BenefitSelection;
  /** Dependent the line is booked for, or null for self-use. */
  familyMemberId?: string | null;
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

/** Loaded dependent rows keyed by id; the primaryUserId filter is the spoof guard. */
type FamilyMemberLite = { id: string; primaryUserId: string; canUseCredits: boolean; fullName: string };

/**
 * Batch-load the dependents referenced by a cart's `familyMemberId`s, scoped to
 * the logged-in user. A foreign / removed id simply won't appear in the map →
 * the eligibility gate returns NOT_OWNED and the line prices NORMAL.
 */
async function loadFamilyMembers(
  client: Pick<Prisma.TransactionClient, "familyMember">,
  ids: string[],
  userId: string,
): Promise<Map<string, FamilyMemberLite>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (unique.length === 0) return new Map();
  const rows = await client.familyMember.findMany({
    where: { id: { in: unique }, primaryUserId: userId },
    select: { id: true, primaryUserId: true, canUseCredits: true, fullName: true },
  });
  return new Map(rows.map((r) => [r.id, r]));
}

/**
 * Compute the family-eligibility gate for a single line from already-loaded
 * data. `forFamilyMember` is true only when the line carries a familyMemberId.
 */
function lineFamilyEligibility(
  familyMemberId: string | null | undefined,
  members: Map<string, FamilyMemberLite>,
  userId: string,
  snapshotFamilyEnabled: boolean,
  rule: SnapshotConsultationRule | null,
) {
  return resolveFamilyEligibility({
    forFamilyMember: Boolean(familyMemberId),
    userId,
    member: familyMemberId ? members.get(familyMemberId) ?? null : null,
    snapshotFamilyEnabled,
    ruleFamilyUsable: rule?.familyUsable ?? false,
  });
}

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

  // Server-side spoof guard: load only the dependents owned by this user.
  const members = await loadFamilyMembers(
    tx,
    input.items.map((i) => i.familyMemberId ?? null).filter((id): id is string => Boolean(id)),
    input.userId,
  );

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

    const benefitSelection: BenefitSelection = item.benefitSelection ?? "PAY_NORMAL";
    const familyEligible = lineFamilyEligibility(
      item.familyMemberId,
      members,
      input.userId,
      snapshot.familyEnabled,
      rule,
    ).eligible;

    const basePriceCents = input.peakPriceByItemId.get(item.id) ?? item.unitPriceCents;
    const resolved = resolveConsultationPrice({
      rule,
      basePriceCents,
      creditsAvailable,
      paidMonthsCount: sub.paidMonthsCount,
      benefitsUnlockAfterPaidMonths: snapshotBenefitsUnlockMonths(snapshot),
      benefitSelection,
      familyEligible,
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
      // Lost the race — re-resolve at zero balance. Per D7, USE_PLAN_CREDIT
      // never silently switches to a discount, so this resolves to NORMAL
      // (NOT_ENOUGH_CREDITS); no credit reserved.
      const fallback = resolveConsultationPrice({
        rule,
        basePriceCents,
        creditsAvailable: 0,
        paidMonthsCount: sub.paidMonthsCount,
        benefitsUnlockAfterPaidMonths: snapshotBenefitsUnlockMonths(snapshot),
        benefitSelection,
        familyEligible,
      });
      lines.set(item.id, { finalUnitPriceCents: fallback.unitPriceCents, creditCovered: false });
      continue;
    }

    lines.set(item.id, { finalUnitPriceCents: resolved.unitPriceCents, creditCovered: false });
  }

  return { subscriptionId: sub.id, lines };
}

export type CoverageMode = PriceMode | "NOT_COVERED";

/** Per-line preview reason — superset of the resolver reason plus NOT_OWNED. */
export type CoverageLineReason = CoverageReason | FamilyIneligibleReason;

export interface CoverageLine {
  itemId: string;
  serviceId: string | null;
  mode: CoverageMode;
  basePriceCents: number;
  finalUnitPriceCents: number;
  creditsUsed: number;
  savedCents: number;
  /** The benefit currently selected on this line. */
  selection: BenefitSelection;
  /** Why the line resolved as it did (so the UI can warn vs. silently charge). */
  reason: CoverageLineReason;
  /** Only the selections this line can honour — drives the cart's selector. */
  eligibleSelections: BenefitSelection[];
  /** Dependent the line targets (null = self). */
  familyMemberId: string | null;
  /** Display name of the dependent (null = self / unknown). */
  familyMemberName: string | null;
}

export interface CartCoverage {
  subscriptionId: string | null;
  planName: string | null;
  consultationCreditsRemaining: number;
  lines: CoverageLine[];
  totalBaseCents: number;
  totalFinalCents: number;
  totalSavedCents: number;
}

/**
 * Read-only price preview (§6a) — the dry-run sibling of
 * `reserveAndPriceConsultations`. Runs the SAME pure resolver per consultation
 * line but reserves NOTHING and writes NOTHING, so the cart/checkout UI can show
 * coverage + savings BEFORE paying. The authoritative price is still recomputed
 * (and credits reserved) at checkout, so any drift here is display-only.
 *
 * Returns an empty coverage (subscriptionId null) for non-subscribers so the
 * caller can show a "subscribe & save" upsell.
 */
export async function previewConsultationPricing(input: {
  userId: string;
  countryCode: string;
  items: CheckoutCartItem[];
  peakPriceByItemId: Map<string, number>;
  now?: Date;
}): Promise<CartCoverage> {
  const now = input.now ?? new Date();
  const empty: CartCoverage = {
    subscriptionId: null,
    planName: null,
    consultationCreditsRemaining: 0,
    lines: [],
    totalBaseCents: 0,
    totalFinalCents: 0,
    totalSavedCents: 0,
  };

  const sub = await prisma.userSubscription.findFirst({
    where: {
      userId: input.userId,
      countryCode: input.countryCode,
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { name: true } } },
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
    return empty;
  }

  const snapshot = asPlanSnapshot(sub.planSnapshot);
  if (!snapshot) return { ...empty, subscriptionId: sub.id, planName: sub.plan.name };

  const members = await loadFamilyMembers(
    prisma,
    input.items.map((i) => i.familyMemberId ?? null).filter((id): id is string => Boolean(id)),
    input.userId,
  );

  const balanceRow = await prisma.subscriptionCreditBalance.findUnique({
    where: { userSubscriptionId_kind: { userSubscriptionId: sub.id, kind: "CONSULTATION" } },
  });
  let creditsAvailable = balanceRow?.balance ?? 0;

  const lines: CoverageLine[] = [];
  let totalBaseCents = 0;
  let totalFinalCents = 0;

  for (const item of input.items) {
    if (!CONSULTATION_KINDS.has(item.kind) || !item.serviceId) continue;
    const basePriceCents = input.peakPriceByItemId.get(item.id) ?? item.unitPriceCents;
    const rule = snapshot.consultationRules.find((r) => r.serviceId === item.serviceId) ?? null;
    const selection: BenefitSelection = item.benefitSelection ?? "PAY_NORMAL";
    const familyMemberId = item.familyMemberId ?? null;
    const familyMemberName = familyMemberId ? members.get(familyMemberId)?.fullName ?? null : null;

    if (!rule) {
      lines.push({
        itemId: item.id,
        serviceId: item.serviceId,
        mode: "NOT_COVERED",
        basePriceCents,
        finalUnitPriceCents: basePriceCents,
        creditsUsed: 0,
        savedCents: 0,
        selection,
        reason: "NOT_COVERED",
        eligibleSelections: ["PAY_NORMAL"],
        familyMemberId,
        familyMemberName,
      });
      totalBaseCents += basePriceCents;
      totalFinalCents += basePriceCents;
      continue;
    }

    const family = lineFamilyEligibility(
      familyMemberId,
      members,
      input.userId,
      snapshot.familyEnabled,
      rule,
    );
    const resolved = resolveConsultationPrice({
      rule,
      basePriceCents,
      creditsAvailable,
      paidMonthsCount: sub.paidMonthsCount,
      benefitsUnlockAfterPaidMonths: snapshotBenefitsUnlockMonths(snapshot),
      benefitSelection: selection,
      familyEligible: family.eligible,
    });
    let creditsUsed = 0;
    if (resolved.mode === "CREDIT") {
      creditsUsed = resolved.creditsToReserve;
      creditsAvailable -= creditsUsed;
    }
    // Prefer the specific family reason (NOT_OWNED / MEMBER_NOT_ALLOWED / …)
    // over the resolver's generic FAMILY_UNAVAILABLE so the UI can be precise.
    const reason: CoverageLineReason = !family.eligible
      ? family.reason ?? resolved.reason
      : resolved.reason;
    lines.push({
      itemId: item.id,
      serviceId: item.serviceId,
      mode: resolved.mode,
      basePriceCents,
      finalUnitPriceCents: resolved.unitPriceCents,
      creditsUsed,
      savedCents: Math.max(0, basePriceCents - resolved.unitPriceCents),
      selection,
      reason,
      eligibleSelections: eligibleBenefitSelections({
        rule,
        paidMonthsCount: sub.paidMonthsCount,
        benefitsUnlockAfterPaidMonths: snapshotBenefitsUnlockMonths(snapshot),
        familyEligible: family.eligible,
      }),
      familyMemberId,
      familyMemberName,
    });
    totalBaseCents += basePriceCents;
    totalFinalCents += resolved.unitPriceCents;
  }

  return {
    subscriptionId: sub.id,
    planName: sub.plan.name,
    consultationCreditsRemaining: creditsAvailable,
    lines,
    totalBaseCents,
    totalFinalCents,
    totalSavedCents: Math.max(0, totalBaseCents - totalFinalCents),
  };
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

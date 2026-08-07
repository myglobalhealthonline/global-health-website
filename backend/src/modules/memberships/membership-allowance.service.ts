import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { holderEnrollmentId } from "./membership-card.service.js";
import type { PricingBenefitRow, PricingEnrollment } from "./membership-pricing.service.js";

/**
 * Allowance accounting (§7). The counter on `MembershipAllowanceBalance.used`
 * is the authority; `MembershipUsageLedger` is the append-only audit trail.
 *
 * Two properties carry the whole design, and both are easy to lose:
 *
 *   1. **The ledger insert is the idempotency gate, and the counter moves only
 *      when the insert actually created a row.** A retried checkout (a
 *      double-click, a replayed webhook) re-runs `spend` with the same
 *      `${orderItemId}:SPEND` key, hits `ON CONFLICT DO NOTHING`, inserts
 *      nothing and returns without touching the counter. Incrementing first
 *      and relying on the unique key to reject the duplicate would make the
 *      retry an ERROR PATH — after the counter had already moved — and let the
 *      two diverge.
 *   2. **`UPDATE ... WHERE used < allocated` is what makes concurrent
 *      checkouts safe.** Postgres takes a row lock for the duration of the
 *      update, so two transactions racing for the last unit serialise on it
 *      and exactly one sees a row affected. A read-then-write would let both
 *      read `used = allocated - 1` and both spend it.
 *
 * When no unit is available the ledger row inserted a moment earlier is
 * deleted again. That happens inside the caller's transaction, so no committed
 * reader ever sees it and the table stays append-only in the sense that
 * matters.
 *
 * Which counter applies is `holderEnrollmentId` + the enrollment's
 * `startDate`, exactly as `loadAllowanceRemaining` reads it — a dependent on a
 * SHARED pool spends its primary's units, and a renewed term gets a new
 * counter rather than a reset one. Any divergence between the read key and the
 * write key would silently split one pool into two, so both go through this
 * module's `balanceKey`.
 */

export type AllowanceSpendOutcome = "spent" | "already-spent" | "unavailable";

export type AllowanceSpendResult = {
  outcome: AllowanceSpendOutcome;
  /** Units left AFTER this spend. Only meaningful for "spent". */
  remainingAfter: number;
  balanceId: string;
};

type AllowanceEnrollment = Pick<
  PricingEnrollment,
  "id" | "memberType" | "primaryEnrollmentId" | "startDate"
> & { level: Pick<PricingEnrollment["level"], "allowancePool"> };

type AllowanceBenefit = Pick<PricingBenefitRow, "id" | "benefitType" | "allowanceCount">;

/** The (counter, term) a spend by this enrollment lands on. */
export function balanceKey(enrollment: AllowanceEnrollment, benefitId: string) {
  return {
    benefitId,
    holderEnrollmentId: holderEnrollmentId({
      id: enrollment.id,
      memberType: enrollment.memberType,
      primaryEnrollmentId: enrollment.primaryEnrollmentId,
      level: enrollment.level,
    }),
    termStart: enrollment.startDate,
  };
}

/**
 * The counter for this holder + term, created on first use. `allocated` is
 * snapshotted from the benefit row now, so an admin editing the row later
 * cannot change what a live term was sold as (§3.5).
 */
export async function getOrCreateBalance(
  tx: Prisma.TransactionClient,
  benefit: AllowanceBenefit,
  enrollment: AllowanceEnrollment,
): Promise<{ id: string; allocated: number; used: number }> {
  const key = balanceKey(enrollment, benefit.id);
  return tx.membershipAllowanceBalance.upsert({
    where: { benefitId_holderEnrollmentId_termStart: key },
    // A concurrent creator wins the unique key and this becomes a no-op update
    // returning their row, which is the behaviour we want.
    update: {},
    create: { ...key, allocated: benefit.allowanceCount ?? 0, used: 0 },
    select: { id: true, allocated: true, used: true },
  });
}

/**
 * Consume one unit for `orderItemId`. Safe to call twice for the same line.
 *
 * Returns "unavailable" when the pool is empty, which is NOT an error — the
 * caller prices the line on the benefit row's fallback instead (§6.2). It can
 * happen even after the options step showed units remaining, because another
 * checkout may have taken the last one in between.
 */
export async function spendAllowanceUnit(
  tx: Prisma.TransactionClient,
  args: {
    benefit: AllowanceBenefit;
    enrollment: AllowanceEnrollment;
    orderId: string;
    orderItemId: string;
  },
): Promise<AllowanceSpendResult> {
  const balance = await getOrCreateBalance(tx, args.benefit, args.enrollment);

  // 1. Ledger first — this is the idempotency gate.
  const inserted = await tx.membershipUsageLedger.createMany({
    data: [
      {
        balanceId: balance.id,
        enrollmentId: args.enrollment.id,
        delta: -1,
        reason: "SPEND",
        orderId: args.orderId,
        orderItemId: args.orderItemId,
        idempotencyKey: `${args.orderItemId}:SPEND`,
      },
    ],
    skipDuplicates: true,
  });
  if (inserted.count === 0) {
    // This line already spent its unit; the counter moved with it.
    return {
      outcome: "already-spent",
      remainingAfter: Math.max(0, balance.allocated - balance.used),
      balanceId: balance.id,
    };
  }

  // 2. Conditional increment. The WHERE is the concurrency guard.
  const updated = await tx.membershipAllowanceBalance.updateMany({
    where: { id: balance.id, used: { lt: balance.allocated } },
    data: { used: { increment: 1 } },
  });
  if (updated.count === 0) {
    await tx.membershipUsageLedger.deleteMany({
      where: { idempotencyKey: `${args.orderItemId}:SPEND` },
    });
    return { outcome: "unavailable", remainingAfter: 0, balanceId: balance.id };
  }

  const after = await tx.membershipAllowanceBalance.findUniqueOrThrow({
    where: { id: balance.id },
    select: { allocated: true, used: true },
  });
  return {
    outcome: "spent",
    remainingAfter: Math.max(0, after.allocated - after.used),
    balanceId: balance.id,
  };
}

/**
 * Give a unit back for `orderItemId`. A no-op when the line never spent one,
 * and a no-op when it has already been refunded — both matter, because the
 * release paths race each other (§7: a Stripe failure, the pre-payment cancel
 * cron and an admin cancelling the order can all fire for the same order).
 */
export async function refundAllowanceUnit(
  tx: Prisma.TransactionClient,
  args: { orderItemId: string },
): Promise<"refunded" | "no-op"> {
  const spend = await tx.membershipUsageLedger.findUnique({
    where: { idempotencyKey: `${args.orderItemId}:SPEND` },
    select: { balanceId: true, enrollmentId: true, orderId: true },
  });
  // Nothing was ever spent for this line (or the spend was rolled back).
  if (!spend) return "no-op";

  const inserted = await tx.membershipUsageLedger.createMany({
    data: [
      {
        balanceId: spend.balanceId,
        enrollmentId: spend.enrollmentId,
        delta: 1,
        reason: "REFUND",
        orderId: spend.orderId,
        orderItemId: args.orderItemId,
        idempotencyKey: `${args.orderItemId}:REFUND`,
      },
    ],
    skipDuplicates: true,
  });
  if (inserted.count === 0) return "no-op";

  // Floored at 0: `used` can only be decremented below zero by a hand-written
  // ADMIN_ADJUST, and a negative counter would hand out free units forever.
  await tx.membershipAllowanceBalance.updateMany({
    where: { id: spend.balanceId, used: { gt: 0 } },
    data: { used: { decrement: 1 } },
  });
  return "refunded";
}

export type AllowanceAdjustResult = {
  balanceId: string;
  allocated: number;
  /** After the adjustment. */
  used: number;
  /** What was actually applied — clamped, so it may differ from what was asked. */
  appliedDelta: number;
};

/**
 * Admin correction of a counter (§7, `POST /allowance-adjust`). Goodwill after a
 * bad experience, or repairing an import that sold the wrong number of units.
 *
 * `SUPER_ADMIN` and a written reason are enforced at the route: this moves what
 * a live member pays, which is why it is the one membership write plan setup
 * cannot do.
 *
 * Two deliberate differences from `spend` / `refund`:
 *
 *   - **No idempotency key can be derived**, because there is no order line to
 *     key on and two identical corrections are two real events. The key is a
 *     random one per call, so a double-submit writes two rows and moves the
 *     counter twice — visible in the ledger and reversible with another adjust,
 *     which is better than silently swallowing the second.
 *   - **The delta is clamped into `[0, allocated]`** rather than rejected. An
 *     admin asking for +5 on a counter with 3 units used means "give them
 *     everything back"; letting `used` go negative would hand out free units
 *     forever, and letting it exceed `allocated` would hide units the member
 *     paid for. `appliedDelta` reports what actually happened so the UI can say
 *     so.
 */
export async function adjustAllowance(
  tx: Prisma.TransactionClient,
  args: {
    balanceId: string;
    enrollmentId: string;
    /** Negative consumes units, positive gives them back. */
    delta: number;
    reason: string;
    actorAdminId: string | null;
    idempotencyKey: string;
  },
): Promise<AllowanceAdjustResult | null> {
  const balance = await tx.membershipAllowanceBalance.findUnique({
    where: { id: args.balanceId },
    select: { id: true, allocated: true, used: true },
  });
  if (!balance) return null;

  // `used` moves in the OPPOSITE direction to the ledger delta: a +1 ledger row
  // is a unit handed back, which decrements the counter (same convention as
  // `refund` above).
  const target = Math.min(balance.allocated, Math.max(0, balance.used - args.delta));
  const appliedDelta = balance.used - target;

  await tx.membershipUsageLedger.create({
    data: {
      balanceId: balance.id,
      enrollmentId: args.enrollmentId,
      delta: appliedDelta,
      reason: "ADMIN_ADJUST",
      actorAdminId: args.actorAdminId,
      note: args.reason,
      idempotencyKey: args.idempotencyKey,
    },
  });
  // A no-op adjustment still writes its ledger row: "an admin tried to give
  // back a unit on a counter that had none spent" is exactly the sort of thing
  // a later dispute needs to be able to see.
  if (appliedDelta !== 0) {
    await tx.membershipAllowanceBalance.update({
      where: { id: balance.id },
      data: { used: target },
    });
  }
  return { balanceId: balance.id, allocated: balance.allocated, used: target, appliedDelta };
}

export class AllowanceAdjustError extends Error {}

/**
 * Route-level orchestration for `POST /allowance-adjust` (§7): resolve the
 * counter this enrollment + benefit lands on, create it if the member has never
 * spent against it, and apply the adjustment in one transaction.
 *
 * The benefit row must belong to the enrollment's own level. Without that check
 * an admin could pass any benefit id in the system and mint a counter against a
 * plan the member is not on — a row that no pricing path would ever read, but
 * which would show up in that plan's usage report as consumption.
 */
export async function adjustEnrollmentAllowance(args: {
  enrollmentId: string;
  benefitId: string;
  delta: number;
  reason: string;
  actorAdminId: string | null;
}): Promise<AllowanceAdjustResult & { benefitId: string }> {
  const enrollment = await prisma.membershipEnrollment.findUnique({
    where: { id: args.enrollmentId },
    select: {
      id: true,
      memberType: true,
      primaryEnrollmentId: true,
      startDate: true,
      levelId: true,
      level: { select: { allowancePool: true } },
    },
  });
  if (!enrollment) throw new AllowanceAdjustError("Membership not found");

  const benefit = await prisma.membershipBenefit.findUnique({
    where: { id: args.benefitId },
    select: { id: true, levelId: true, benefitType: true, allowanceCount: true },
  });
  if (!benefit || benefit.levelId !== enrollment.levelId) {
    throw new AllowanceAdjustError("That benefit does not belong to this membership's level");
  }
  if (benefit.benefitType !== "ALLOWANCE") {
    throw new AllowanceAdjustError("Only an allowance benefit has a counter to adjust");
  }

  return prisma.$transaction(async (tx) => {
    const balance = await getOrCreateBalance(tx, benefit, enrollment);
    const result = await adjustAllowance(tx, {
      balanceId: balance.id,
      // The LEDGER records who it was adjusted for, which may be a dependent
      // even though the counter belongs to their primary under a SHARED pool.
      enrollmentId: enrollment.id,
      delta: args.delta,
      reason: args.reason,
      actorAdminId: args.actorAdminId,
      // No order line to key on, and two identical corrections are two real
      // events — see `adjustAllowance`.
      idempotencyKey: `adjust:${randomUUID()}`,
    });
    if (!result) throw new AllowanceAdjustError("Allowance counter not found");
    return { ...result, benefitId: benefit.id };
  });
}

/**
 * Release every allowance unit an order's lines hold. The compensating write
 * for everything past the checkout transaction's commit — a failed Stripe
 * session, an abandoned order, an admin cancellation, a refund (§7).
 *
 * Mirrors `releaseOrderCreditReservations` and is wired at the same call
 * sites. Idempotent, and a no-op for orders with no membership lines, so it is
 * safe to call unconditionally.
 */
export async function releaseOrderMembershipAllowance(orderId: string): Promise<void> {
  const items = await prisma.orderItem.findMany({
    where: { orderId, membershipAllowanceUsed: true },
    select: { id: true },
  });
  if (items.length === 0) return;
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await refundAllowanceUnit(tx, { orderItemId: item.id });
    }
  });
}

/**
 * Release the allowance held by ONE appointment's order line. Appointment-level
 * cancellation leaves the order PAID, so the order-wide release above would be
 * wrong here — only the cancelled consultation gives its unit back.
 *
 * Note the asymmetry this creates with subscription plan credits, which are
 * NOT released on appointment cancellation today. Deliberate and recorded in
 * the spec (§7) as an open product question, not something Phase 5 resolves:
 * decision 16 says an allowance unit returns on cancellation, and an allowance
 * line was charged €0, so keeping the unit spent would take something for
 * nothing.
 */
export async function releaseMembershipAllowanceForSlot(
  timeSlotId: string | null | undefined,
): Promise<void> {
  // There is no Appointment -> OrderItem column: the two are joined by the
  // time slot, which is what checkout itself uses to pair a cart line with its
  // order line (orders.route.ts, `cartToOrderItem`). An appointment with no
  // slot (a manual booking) has no line to refund.
  //
  // The slot id is a PARAMETER, not read from the appointment, because every
  // cancellation path calls `releaseAppointmentSlot` — which nulls
  // `Appointment.timeSlotId`. Reading it here would work or not depending on
  // call order, and would silently stop working the day someone reorders two
  // lines. Callers pass the id they captured before releasing the slot.
  if (!timeSlotId) return;
  const items = await prisma.orderItem.findMany({
    where: { timeSlotId, membershipAllowanceUsed: true },
    select: { id: true },
  });
  if (items.length === 0) return;
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await refundAllowanceUnit(tx, { orderItemId: item.id });
    }
  });
}

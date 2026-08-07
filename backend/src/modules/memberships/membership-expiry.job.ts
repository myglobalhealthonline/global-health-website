import { prisma } from "../../db/prisma.js";
import { refundAllowanceUnit } from "./membership-allowance.service.js";

/**
 * Daily membership housekeeping (§5.4, §7). Two unrelated jobs share a run
 * because they share a cadence and a lock, not because they share logic.
 *
 * **1. Expiry.** `ACTIVE` enrollments past their `endDate` become `EXPIRED`.
 *
 * This is a **convenience only**. `enrollmentGrantsBenefits` re-checks the term
 * dates on every pricing call, so a membership that expired an hour ago already
 * grants nothing whether or not this job has run. What the job buys is that the
 * admin list, the member's own portal and the reports agree with reality
 * instead of showing a green ACTIVE badge on a dead membership. A missed run
 * cannot leak a benefit, which is why it is safe to fail open.
 *
 * **2. Allowance reconciliation.** The backstop behind §7's five order-level
 * release sites plus appointment cancellation: any `SPEND` on a line whose
 * order is CANCELLED, with no matching `REFUND`, is a unit the member paid for
 * and did not get back.
 *
 * The spec says "flag". This releases as well, and reports how many it had to.
 * Every row it finds is provably owed — the order is cancelled and no refund
 * exists — and `refundAllowanceUnit` is idempotent and writes its own ledger
 * row, so the repair is as auditable as the leak. A non-zero count still means
 * one of the release sites failed and a human needs to look; leaving the member
 * short until they do would be the wrong side to err on.
 */

export type MembershipExpiryResult = {
  /** Enrollments moved ACTIVE → EXPIRED, primaries and dependents together. */
  expired: number;
  /** Dependents expired because their primary did, included in `expired`. */
  dependentsExpired: number;
  /** Allowance units handed back by the reconciliation pass. */
  reconciledUnits: number;
};

export async function runMembershipExpiryJob(
  now: Date = new Date(),
): Promise<MembershipExpiryResult> {
  const expiredPrimaries = await prisma.membershipEnrollment.findMany({
    where: { status: "ACTIVE", endDate: { not: null, lt: now } },
    select: { id: true },
  });
  const expiredIds = expiredPrimaries.map((e) => e.id);

  let expired = 0;
  if (expiredIds.length > 0) {
    const result = await prisma.membershipEnrollment.updateMany({
      where: { id: { in: expiredIds }, status: "ACTIVE" },
      data: { status: "EXPIRED" },
    });
    expired = result.count;
  }

  // Dependents follow their primary (§5.4). Done as a second pass keyed on the
  // primary's status rather than on its endDate, because a dependent may carry
  // no endDate of its own — its term IS the primary's, and reading only dates
  // would leave it ACTIVE forever under an expired primary.
  const dependents = await prisma.membershipEnrollment.updateMany({
    where: {
      status: "ACTIVE",
      memberType: "DEPENDENT",
      primaryEnrollment: { status: { in: ["EXPIRED", "REMOVED"] } },
    },
    data: { status: "EXPIRED" },
  });
  expired += dependents.count;

  return {
    expired,
    dependentsExpired: dependents.count,
    reconciledUnits: await reconcileCancelledOrderAllowance(),
  };
}

/**
 * Hand back allowance units still held against cancelled orders (§7).
 *
 * Scoped to `membershipAllowanceUsed` lines whose order is CANCELLED and which
 * have a SPEND but no REFUND in the ledger. The ledger, not the boolean, is the
 * authority on what was actually consumed — `membershipAllowanceUsed` records
 * what checkout decided, and a line refunded earlier keeps it set.
 */
export async function reconcileCancelledOrderAllowance(): Promise<number> {
  const leaked = await prisma.orderItem.findMany({
    where: {
      membershipAllowanceUsed: true,
      order: { status: "CANCELLED" },
    },
    select: { id: true },
  });
  if (leaked.length === 0) return 0;

  // One round-trip for the keys rather than one per line: a cancelled-order
  // sweep can see thousands of lines and nearly all of them are already
  // refunded, so the interesting set is usually empty.
  const spendKeys = leaked.map((i) => `${i.id}:SPEND`);
  const refundKeys = leaked.map((i) => `${i.id}:REFUND`);
  const rows = await prisma.membershipUsageLedger.findMany({
    where: { idempotencyKey: { in: [...spendKeys, ...refundKeys] } },
    select: { idempotencyKey: true },
  });
  const seen = new Set(rows.map((r) => r.idempotencyKey));
  const outstanding = leaked.filter(
    (i) => seen.has(`${i.id}:SPEND`) && !seen.has(`${i.id}:REFUND`),
  );
  if (outstanding.length === 0) return 0;

  let released = 0;
  for (const item of outstanding) {
    // One transaction per line: a single bad row must not roll back the repair
    // of every other member's unit in the same sweep.
    const outcome = await prisma.$transaction((tx) =>
      refundAllowanceUnit(tx, { orderItemId: item.id }),
    );
    if (outcome === "refunded") released += 1;
  }
  return released;
}

import { Prisma, type CreditKind } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  adjustmentKey,
  commitKey,
  periodGrantKey,
  periodResetKey,
  periodWellnessEarnKey,
  releaseKey,
  reserveKey,
} from "./credit-keys.js";

/**
 * Credit counter — the SOLE spend authority (§36.1).
 *
 * Spend = atomic conditional UPDATE `SET balance = balance - n WHERE balance >= n`
 * (Prisma `updateMany` with a `gte` guard). Postgres re-evaluates the predicate
 * against the locked row under READ COMMITTED, so two concurrent "last credit"
 * bookings can never both succeed — the loser's rowcount is 0 and it falls
 * through to the paid price.
 *
 * The append-only ledgers are the audit/reconciliation trail (`balanceAfterHint`
 * is advisory only). Reservation lifecycle: RESERVED(−n) → terminal CONSUMED/
 * REDEEMED(0) | RELEASED(+n). The raw-SQL partial-unique terminal index makes
 * commit/release mutually exclusive per reservation.
 */

type Tx = Prisma.TransactionClient;

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

/** Ensure the counter row exists (idempotent). Call before first read/spend. */
export async function ensureBalanceRow(
  tx: Tx,
  userSubscriptionId: string,
  kind: CreditKind,
  initial = 0,
): Promise<void> {
  await tx.subscriptionCreditBalance.upsert({
    where: { userSubscriptionId_kind: { userSubscriptionId, kind } },
    create: { userSubscriptionId, kind, balance: initial },
    update: {},
  });
}

/** Read the live counter balance (0 when no row). */
export async function getBalance(
  userSubscriptionId: string,
  kind: CreditKind,
): Promise<number> {
  const row = await prisma.subscriptionCreditBalance.findUnique({
    where: { userSubscriptionId_kind: { userSubscriptionId, kind } },
  });
  return row?.balance ?? 0;
}

export interface ReserveInput {
  userSubscriptionId: string;
  userId: string;
  kind: CreditKind;
  amount: number;
  reservationId: string;
  reservedUntil: Date;
  serviceId?: string | null;
  orderItemId?: string | null;
  appointmentId?: string | null;
  healthTestId?: string | null;
  redemptionId?: string | null;
  billingPeriodStart?: Date | null;
}

/**
 * Atomically reserve `amount` credits. Returns false (no ledger row written)
 * when the balance is insufficient — caller falls through to paid price.
 * Must run inside the caller's transaction so the reserve + the surrounding
 * order/redemption write commit together.
 */
export async function reserveCredits(tx: Tx, input: ReserveInput): Promise<boolean> {
  if (input.amount <= 0) return true;
  const updated = await tx.subscriptionCreditBalance.updateMany({
    where: {
      userSubscriptionId: input.userSubscriptionId,
      kind: input.kind,
      balance: { gte: input.amount },
    },
    data: { balance: { decrement: input.amount } },
  });
  if (updated.count === 0) return false;

  const ledgerData = {
    userSubscriptionId: input.userSubscriptionId,
    userId: input.userId,
    deltaCredits: -input.amount,
    reservationId: input.reservationId,
    reservedUntil: input.reservedUntil,
    idempotencyKey: reserveKey(input.reservationId),
  };

  if (input.kind === "CONSULTATION") {
    await tx.consultationCreditLedger.create({
      data: {
        ...ledgerData,
        reason: "RESERVED",
        serviceId: input.serviceId ?? null,
        orderItemId: input.orderItemId ?? null,
        appointmentId: input.appointmentId ?? null,
        billingPeriodStart: input.billingPeriodStart ?? null,
      },
    });
  } else {
    await tx.wellnessCreditLedger.create({
      data: {
        ...ledgerData,
        reason: "RESERVED",
        healthTestId: input.healthTestId ?? null,
        redemptionId: input.redemptionId ?? null,
      },
    });
  }
  return true;
}

export type TerminalResult = "committed" | "released" | "already_committed" | "already_released";

interface TerminalInput {
  userSubscriptionId: string;
  userId: string;
  kind: CreditKind;
  amount: number;
  reservationId: string;
}

/**
 * Commit a reservation: write the terminal CONSUMED/REDEEMED row (deltaCredits
 * 0 — the counter was already decremented at reserve). Mutually exclusive with
 * release via the terminal-uniqueness index. Idempotent on retry.
 */
export async function commitReservation(tx: Tx, input: TerminalInput): Promise<TerminalResult> {
  const existing = await findTerminal(tx, input.kind, input.reservationId);
  if (existing === "commit") return "already_committed";
  if (existing === "release") return "already_released";

  const reason = input.kind === "CONSULTATION" ? "CONSUMED" : "REDEEMED";
  try {
    await createTerminalRow(tx, input, reason, 0);
    return "committed";
  } catch (err) {
    if (isUniqueViolation(err)) {
      const after = await findTerminal(tx, input.kind, input.reservationId);
      return after === "release" ? "already_released" : "already_committed";
    }
    throw err;
  }
}

/**
 * Release a reservation: write terminal RELEASED row (+amount) AND increment the
 * counter. No-op if the reservation was already committed (the terminal index
 * blocks it). Used by the abandoned-checkout sweep.
 */
export async function releaseReservation(tx: Tx, input: TerminalInput): Promise<TerminalResult> {
  const existing = await findTerminal(tx, input.kind, input.reservationId);
  if (existing === "commit") return "already_committed";
  if (existing === "release") return "already_released";

  const reason = input.kind === "CONSULTATION" ? "RELEASED" : "RELEASED";
  try {
    await createTerminalRow(tx, input, reason, input.amount);
  } catch (err) {
    if (isUniqueViolation(err)) {
      const after = await findTerminal(tx, input.kind, input.reservationId);
      return after === "commit" ? "already_committed" : "already_released";
    }
    throw err;
  }
  // Return the credit to the counter only after the terminal row is secured.
  await tx.subscriptionCreditBalance.updateMany({
    where: { userSubscriptionId: input.userSubscriptionId, kind: input.kind },
    data: { balance: { increment: input.amount } },
  });
  return "released";
}

async function findTerminal(
  tx: Tx,
  kind: CreditKind,
  reservationId: string,
): Promise<"commit" | "release" | null> {
  if (kind === "CONSULTATION") {
    const row = await tx.consultationCreditLedger.findFirst({
      where: { reservationId, reason: { in: ["CONSUMED", "RELEASED"] } },
      select: { reason: true },
    });
    if (!row) return null;
    return row.reason === "CONSUMED" ? "commit" : "release";
  }
  const row = await tx.wellnessCreditLedger.findFirst({
    where: { reservationId, reason: { in: ["REDEEMED", "RELEASED"] } },
    select: { reason: true },
  });
  if (!row) return null;
  return row.reason === "REDEEMED" ? "commit" : "release";
}

async function createTerminalRow(
  tx: Tx,
  input: TerminalInput,
  reason: string,
  delta: number,
): Promise<void> {
  const isCommit = reason === "CONSUMED" || reason === "REDEEMED";
  const key = isCommit ? commitKey(input.reservationId) : releaseKey(input.reservationId);
  const base = {
    userSubscriptionId: input.userSubscriptionId,
    userId: input.userId,
    deltaCredits: delta,
    reservationId: input.reservationId,
    idempotencyKey: key,
  };
  if (input.kind === "CONSULTATION") {
    await tx.consultationCreditLedger.create({
      data: { ...base, reason: reason as "CONSUMED" | "RELEASED" },
    });
  } else {
    await tx.wellnessCreditLedger.create({
      data: { ...base, reason: reason as "REDEEMED" | "RELEASED" },
    });
  }
}

export interface MonthlyGrantInput {
  userSubscriptionId: string;
  userId: string;
  periodStart: Date;
  /** Snapshot's monthly consultation credits (the authoritative amount). */
  consultationCredits: number;
  /** Snapshot's wellness credits per month (0 = none, non-Premium). */
  wellnessCredits: number;
}

/**
 * Monthly reset + grant, one atomic op, keyed per BILLING PERIOD (§36.2).
 * Resets prior unused consultation credits to zero then grants the new month's
 * (no rollover, Q1=A). Wellness is additive (never resets, D13). Idempotent:
 * a duplicate period grant is a no-op (the unique grant key blocks it).
 *
 * Returns whether a fresh grant was applied (false = duplicate/no-op).
 */
export async function grantMonthlyCredits(tx: Tx, input: MonthlyGrantInput): Promise<boolean> {
  // Idempotency gate: if the grant key already exists, this period is done.
  const grantKey = periodGrantKey(input.userSubscriptionId, input.periodStart);
  const seen = await tx.consultationCreditLedger.findUnique({
    where: { idempotencyKey: grantKey },
    select: { id: true },
  });
  if (seen) return false;

  await ensureBalanceRow(tx, input.userSubscriptionId, "CONSULTATION");

  // Read prior balance to record the RESET_EXPIRE delta for audit, then SET
  // the counter to the new month's amount (reset + grant in one move).
  const prior = await tx.subscriptionCreditBalance.findUnique({
    where: {
      userSubscriptionId_kind: {
        userSubscriptionId: input.userSubscriptionId,
        kind: "CONSULTATION",
      },
    },
  });
  const priorBalance = prior?.balance ?? 0;

  if (priorBalance !== 0) {
    await tx.consultationCreditLedger.create({
      data: {
        userSubscriptionId: input.userSubscriptionId,
        userId: input.userId,
        deltaCredits: -priorBalance,
        reason: "RESET_EXPIRE",
        billingPeriodStart: input.periodStart,
        idempotencyKey: periodResetKey(input.userSubscriptionId, input.periodStart),
      },
    });
  }

  await tx.subscriptionCreditBalance.update({
    where: {
      userSubscriptionId_kind: {
        userSubscriptionId: input.userSubscriptionId,
        kind: "CONSULTATION",
      },
    },
    data: { balance: input.consultationCredits },
  });

  await tx.consultationCreditLedger.create({
    data: {
      userSubscriptionId: input.userSubscriptionId,
      userId: input.userId,
      deltaCredits: input.consultationCredits,
      reason: "MONTHLY_GRANT",
      balanceAfterHint: input.consultationCredits,
      billingPeriodStart: input.periodStart,
      idempotencyKey: grantKey,
    },
  });

  // Wellness: additive, only when the snapshot grants it (Premium, D12).
  if (input.wellnessCredits > 0) {
    await ensureBalanceRow(tx, input.userSubscriptionId, "WELLNESS");
    await tx.subscriptionCreditBalance.update({
      where: {
        userSubscriptionId_kind: {
          userSubscriptionId: input.userSubscriptionId,
          kind: "WELLNESS",
        },
      },
      data: { balance: { increment: input.wellnessCredits } },
    });
    await tx.wellnessCreditLedger.create({
      data: {
        userSubscriptionId: input.userSubscriptionId,
        userId: input.userId,
        deltaCredits: input.wellnessCredits,
        reason: "MONTHLY_EARN",
        idempotencyKey: periodWellnessEarnKey(input.userSubscriptionId, input.periodStart),
      },
    });
  }

  return true;
}

export interface ClawbackInput {
  userSubscriptionId: string;
  userId: string;
  kind: CreditKind;
  /** Positive number of credits to remove. Counter floors at 0. */
  amount: number;
  idempotencyKey: string;
}

/**
 * Clawback credits after a refund/dispute (§36.5). Removes up to `amount` from
 * the counter (never below 0) and records a CLAWBACK ledger row. Idempotent
 * via the supplied key.
 */
export async function clawbackCredits(tx: Tx, input: ClawbackInput): Promise<boolean> {
  const seen = await terminalKeySeen(tx, input.kind, input.idempotencyKey);
  if (seen) return false;
  await ensureBalanceRow(tx, input.userSubscriptionId, input.kind);
  const current = await tx.subscriptionCreditBalance.findUnique({
    where: {
      userSubscriptionId_kind: {
        userSubscriptionId: input.userSubscriptionId,
        kind: input.kind,
      },
    },
  });
  const remove = Math.min(input.amount, current?.balance ?? 0);
  if (remove > 0) {
    await tx.subscriptionCreditBalance.update({
      where: {
        userSubscriptionId_kind: {
          userSubscriptionId: input.userSubscriptionId,
          kind: input.kind,
        },
      },
      data: { balance: { decrement: remove } },
    });
  }
  await writeAdjustmentRow(tx, input.kind, {
    userSubscriptionId: input.userSubscriptionId,
    userId: input.userId,
    deltaCredits: -remove,
    reason: "CLAWBACK",
    idempotencyKey: input.idempotencyKey,
  });
  return true;
}

async function terminalKeySeen(tx: Tx, kind: CreditKind, key: string): Promise<boolean> {
  if (kind === "CONSULTATION") {
    return Boolean(
      await tx.consultationCreditLedger.findUnique({
        where: { idempotencyKey: key },
        select: { id: true },
      }),
    );
  }
  return Boolean(
    await tx.wellnessCreditLedger.findUnique({
      where: { idempotencyKey: key },
      select: { id: true },
    }),
  );
}

async function writeAdjustmentRow(
  tx: Tx,
  kind: CreditKind,
  data: {
    userSubscriptionId: string;
    userId: string;
    deltaCredits: number;
    reason: "ADJUSTMENT" | "CLAWBACK";
    idempotencyKey: string;
  },
): Promise<void> {
  if (kind === "CONSULTATION") {
    await tx.consultationCreditLedger.create({ data });
  } else {
    await tx.wellnessCreditLedger.create({ data });
  }
}

export interface AdjustCreditsInput {
  userSubscriptionId: string;
  kind: CreditKind;
  /** Signed delta. Positive grants, negative removes (counter floors at 0). */
  delta: number;
  reason: "ADJUSTMENT" | "CLAWBACK";
  idempotencyKey: string;
  actorAdminId: string;
}

/**
 * Public contract (contracts.md): manual admin credit grant/clawback. Keeps the
 * counter authoritative. Sprint 2's admin UI calls this. Idempotent via key;
 * the caller is responsible for the audit row at the route layer.
 */
export async function adjustCredits(
  input: AdjustCreditsInput,
): Promise<{ balance: number }> {
  return prisma.$transaction(async (tx) => {
    const seen = await terminalKeySeen(tx, input.kind, input.idempotencyKey);
    if (seen) {
      const row = await tx.subscriptionCreditBalance.findUnique({
        where: {
          userSubscriptionId_kind: {
            userSubscriptionId: input.userSubscriptionId,
            kind: input.kind,
          },
        },
      });
      return { balance: row?.balance ?? 0 };
    }

    const sub = await tx.userSubscription.findUnique({
      where: { id: input.userSubscriptionId },
      select: { userId: true },
    });
    if (!sub) throw new Error("Subscription not found");

    await ensureBalanceRow(tx, input.userSubscriptionId, input.kind);
    const current = await tx.subscriptionCreditBalance.findUniqueOrThrow({
      where: {
        userSubscriptionId_kind: {
          userSubscriptionId: input.userSubscriptionId,
          kind: input.kind,
        },
      },
    });
    const next = Math.max(0, current.balance + input.delta);
    await tx.subscriptionCreditBalance.update({
      where: {
        userSubscriptionId_kind: {
          userSubscriptionId: input.userSubscriptionId,
          kind: input.kind,
        },
      },
      data: { balance: next },
    });
    await writeAdjustmentRow(tx, input.kind, {
      userSubscriptionId: input.userSubscriptionId,
      userId: sub.userId,
      deltaCredits: next - current.balance,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    });
    return { balance: next };
  });
}

/** Build the admin adjustment idempotency key (re-exported for callers). */
export { adjustmentKey };

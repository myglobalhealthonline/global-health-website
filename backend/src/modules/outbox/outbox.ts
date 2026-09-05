import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { emitOpsAlert } from "../subscriptions/ops/ops-alert.js";
// Type-only: erased at compile time, so no runtime import cycle with
// complete-order-payment.service (which imports enqueueOrderPaidAutomations
// from here). The runtime call uses a dynamic import inside dispatchOutboxRow.
import type { PaymentLog } from "../orders/complete-order-payment.service.js";

export type OutboxLog = { info: (m: string) => void; error: (m: string) => void };

/** Side-effect kinds we durably queue. Extend as more move off the request path. */
export const OUTBOX_KIND_ORDER_PAID_AUTOMATIONS = "order_paid_automations";
export const OUTBOX_KIND_RECRUITMENT_APPLICATION_NOTIFICATION =
  "recruitment_application_notification";
/** 24h appointment reminders — one row per audience, keyed on the appointment
 *  state the reminder was minted for (see appointment-reminder.service.ts). */
export const OUTBOX_KIND_APPOINTMENT_REMINDER_PATIENT = "appointment_reminder_patient_24h";
export const OUTBOX_KIND_APPOINTMENT_REMINDER_DOCTOR = "appointment_reminder_doctor_24h";

// Minimal client surface so enqueue can run inside a Prisma interactive
// transaction (tx) OR standalone against the shared client.
type OutboxEnqueueClient = {
  outbox: {
    createMany: (args: {
      data: Prisma.OutboxCreateManyInput[];
      skipDuplicates?: boolean;
    }) => Promise<{ count: number }>;
  };
};

/**
 * Durably enqueue the post-payment side-effect chain for an order. Idempotent:
 * one row per order (unique idempotencyKey), so the in-transaction first-flip,
 * webhook redeliveries, and sync-order self-heals all collapse to a single
 * PENDING row. Pass the transaction client (`tx`) to write it in the SAME
 * commit that flips the order to PAID.
 */
export async function enqueueOrderPaidAutomations(
  client: OutboxEnqueueClient,
  orderId: string,
  opts: { sendShopConfirmation: boolean },
): Promise<void> {
  await client.outbox.createMany({
    data: [
      {
        kind: OUTBOX_KIND_ORDER_PAID_AUTOMATIONS,
        idempotencyKey: `${OUTBOX_KIND_ORDER_PAID_AUTOMATIONS}:${orderId}`,
        payload: { orderId, sendShopConfirmation: opts.sendShopConfirmation },
      },
    ],
    skipDuplicates: true,
  });
}

// ── Retry/backoff decision (pure, unit-tested) ───────────────────────────────

export const OUTBOX_MAX_ATTEMPTS = 8;
const OUTBOX_BACKOFF_BASE_MS = 60_000; // 1 min
const OUTBOX_BACKOFF_CAP_MS = 30 * 60_000; // 30 min

/** Backoff required after `attemptsMade` failed attempts, exponential + capped. */
export function outboxBackoffMs(attemptsMade: number): number {
  if (attemptsMade <= 0) return 0;
  const ms = OUTBOX_BACKOFF_BASE_MS * 2 ** (attemptsMade - 1);
  return Math.min(ms, OUTBOX_BACKOFF_CAP_MS);
}

/** Is a PENDING row due to be attempted now, honouring its backoff window? */
export function outboxRowIsDue(
  row: { attempts: number; lastAttemptAt: Date | null },
  now: Date,
): boolean {
  if (!row.lastAttemptAt) return true;
  return now.getTime() - row.lastAttemptAt.getTime() >= outboxBackoffMs(row.attempts);
}

/** After a failed attempt, does the row retry (PENDING) or die (FAILED)? */
export function outboxNextStatusAfterFailure(attemptsMade: number): "PENDING" | "FAILED" {
  return attemptsMade >= OUTBOX_MAX_ATTEMPTS ? "FAILED" : "PENDING";
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

const OUTBOX_BATCH = 25;
const OUTBOX_ROW_TIMEOUT_MS = 25_000;
const OUTBOX_STALE_PROCESSING_MS = 5 * 60_000;

// ponytail: race-based deadline — does NOT cancel the underlying provider call
// (it keeps running to completion), it just frees the dispatcher and re-queues
// the row. Safe because every side-effect fn behind it is idempotent. Upgrade
// to per-provider AbortSignal cancellation only if a hung provider proves costly.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`outbox dispatch timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function toPaymentLog(log: OutboxLog): PaymentLog {
  const fmt = (obj: unknown, msg?: string) =>
    `${msg ?? ""} ${obj !== undefined ? JSON.stringify(obj) : ""}`.trim();
  return {
    info: (o, m) => log.info(fmt(o, m)),
    warn: (o, m) => log.info(fmt(o, m)),
    error: (o, m) => log.error(fmt(o, m)),
  };
}

async function dispatchOutboxRow(
  row: { kind: string; payload: unknown },
  log: OutboxLog,
): Promise<void> {
  switch (row.kind) {
    case OUTBOX_KIND_ORDER_PAID_AUTOMATIONS: {
      const payload = row.payload as { orderId?: string; sendShopConfirmation?: boolean } | null;
      if (!payload?.orderId) throw new Error("order_paid_automations: missing orderId in payload");
      const { ensureOrderPaidAutomations } = await import(
        "../orders/complete-order-payment.service.js"
      );
      await ensureOrderPaidAutomations(payload.orderId, toPaymentLog(log), {
        sendShopConfirmation: payload.sendShopConfirmation === true,
      });
      return;
    }
    case OUTBOX_KIND_RECRUITMENT_APPLICATION_NOTIFICATION: {
      const payload = row.payload as { applicationId?: unknown } | null;
      if (
        typeof payload?.applicationId !== "string" ||
        payload.applicationId.length < 1 ||
        payload.applicationId.length > 64
      ) {
        throw new Error("recruitment_application_notification: missing applicationId in payload");
      }
      const { sendRecruitmentApplicationNotification } = await import(
        "../recruitment/recruitment-email.js"
      );
      await sendRecruitmentApplicationNotification(payload.applicationId);
      return;
    }
    case OUTBOX_KIND_APPOINTMENT_REMINDER_PATIENT: {
      const { dispatchPatientAppointmentReminder } = await import(
        "../appointments/appointment-reminder.service.js"
      );
      await dispatchPatientAppointmentReminder(row.payload);
      return;
    }
    case OUTBOX_KIND_APPOINTMENT_REMINDER_DOCTOR: {
      const { dispatchDoctorAppointmentReminder } = await import(
        "../appointments/appointment-reminder.service.js"
      );
      await dispatchDoctorAppointmentReminder(row.payload);
      return;
    }
    default:
      throw new Error(`Unknown outbox kind: ${row.kind}`);
  }
}

/**
 * Drain a batch of due outbox rows. Single-flight is guaranteed by the caller's
 * advisory lock; the per-row atomic claim (PENDING -> PROCESSING) is a second
 * guard so no row is ever dispatched twice even under overlap. Never throws —
 * per-row failures are recorded and retried with backoff.
 */
export async function runOutboxDispatch(
  log: OutboxLog,
): Promise<{ processed: number; sent: number; failed: number }> {
  const now = new Date();

  // Reclaim rows stranded in PROCESSING by a crashed prior tick.
  await prisma.outbox.updateMany({
    where: {
      status: "PROCESSING",
      lastAttemptAt: { lt: new Date(now.getTime() - OUTBOX_STALE_PROCESSING_MS) },
    },
    data: { status: "PENDING" },
  });

  const candidates = await prisma.outbox.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: OUTBOX_BATCH,
  });

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const row of candidates) {
    if (!outboxRowIsDue(row, new Date())) continue;

    // Atomic claim: only one worker/tick can flip PENDING -> PROCESSING.
    const claim = await prisma.outbox.updateMany({
      where: { id: row.id, status: "PENDING" },
      data: { status: "PROCESSING", attempts: { increment: 1 }, lastAttemptAt: new Date() },
    });
    if (claim.count !== 1) continue; // grabbed by someone else

    processed++;
    const attemptsMade = row.attempts + 1;
    try {
      await withTimeout(dispatchOutboxRow(row, log), OUTBOX_ROW_TIMEOUT_MS);
      await prisma.outbox.update({
        where: { id: row.id },
        data: { status: "SENT", processedAt: new Date(), lastError: null },
      });
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = outboxNextStatusAfterFailure(attemptsMade);
      await prisma.outbox.update({
        where: { id: row.id },
        data: { status, lastError: msg.slice(0, 1000) },
      });
      if (status === "FAILED") {
        failed++;
        log.error(`[outbox] row ${row.kind} failed permanently after ${attemptsMade} attempts: ${msg}`);
        void emitOpsAlert({
          severity: "critical",
          title: "Outbox side-effect failed permanently",
          detail: msg,
          context: { kind: row.kind, attempts: attemptsMade },
        });
      } else {
        log.error(`[outbox] row ${row.kind} attempt ${attemptsMade} failed, will retry: ${msg}`);
      }
    }
  }

  return { processed, sent, failed };
}

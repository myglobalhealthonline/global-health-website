import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
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
export const OUTBOX_KIND_META_CAPI_PURCHASE = "meta_capi_purchase";
/** 24h appointment reminders — one row per audience, keyed on the appointment
 *  state the reminder was minted for (see appointment-reminder.service.ts). */
export const OUTBOX_KIND_APPOINTMENT_REMINDER_PATIENT = "appointment_reminder_patient_24h";
export const OUTBOX_KIND_APPOINTMENT_REMINDER_DOCTOR = "appointment_reminder_doctor_24h";
/** PR-3: deletion of ONE personal (non-clinical) upload from object storage. */
export const OUTBOX_KIND_PERSONAL_OBJECT_PURGE = "personal_object_purge";

/**
 * The only object-storage namespaces this queue may ever delete from.
 *
 * Personal uploads and clinical files share the `patient-docs/<profileId>/`
 * root — clinical MedicalDocument files live under `.../medical/` and
 * identity-verification selfies under `.../identity-verification/`, neither of
 * which anonymization clears and neither of which may be purged here. Matching
 * on the sub-namespace is what makes "a clinical file can never be deleted by
 * this queue" a property of the code rather than of the caller.
 *
 * Derived from the upload writers in account-profile.route.ts:
 *   insurance/  id-document/  nationality-<slot>/
 */
const PERSONAL_UPLOAD_KEY_PATTERN =
  /^patient-docs\/[^/]+\/(?:insurance|id-document|nationality-[^/]*)\//;

export function isPersonalUploadStorageKey(key: string): boolean {
  return PERSONAL_UPLOAD_KEY_PATTERN.test(key);
}

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

/**
 * Durably queue the deletion of personal (non-clinical) uploads, one row per
 * object, in the SAME transaction that clears the DB references to them.
 *
 * Before this, the two anonymization paths each lost objects a different way:
 * the admin path nulled the columns and wrote the keys into AuditLog metadata
 * for "a later purge job" that never existed, and the self-service purge called
 * deleteObject inline, logged the raw key on failure and carried on — so a
 * failed delete became an untracked orphan either way.
 *
 * The idempotency key is a SHA-256 digest, never the storage key itself: an
 * Outbox row is operational data with a much wider audience than the object it
 * names. Duplicate and blank keys collapse, so re-running anonymization enqueues
 * nothing new.
 *
 * @returns how many distinct objects were queued (safe to log — a count, not a key).
 */
export async function enqueuePersonalObjectPurge(
  client: OutboxEnqueueClient,
  storageKeys: readonly (string | null | undefined)[],
  opts: { patientProfileId?: string } = {},
): Promise<number> {
  const unique = [
    ...new Set(
      storageKeys.filter((k): k is string => typeof k === "string" && k.trim().length > 0),
    ),
  ];
  if (unique.length === 0) return 0;
  // The INSERTED count, not the requested one: this number is written into the
  // PATIENT_ANONYMIZED audit row as evidence, and `skipDuplicates` means a
  // re-run inserts fewer rows than it asked for. Claiming the requested count
  // would overstate what this call actually queued.
  const created = await client.outbox.createMany({
    data: unique.map((storageKey) => ({
      kind: OUTBOX_KIND_PERSONAL_OBJECT_PURGE,
      idempotencyKey: `${OUTBOX_KIND_PERSONAL_OBJECT_PURGE}:${createHash("sha256")
        .update(storageKey)
        .digest("hex")}`,
      // patientProfileId is an opaque id, and it is what lets the deletion-request
      // workflow tell "purge queued" from "purge done" before claiming COMPLETED.
      payload: opts.patientProfileId
        ? { storageKey, patientProfileId: opts.patientProfileId }
        : { storageKey },
    })),
    skipDuplicates: true,
  });
  return created.count;
}

/**
 * Is any personal-object purge for this patient still outstanding (queued,
 * running, or permanently failed)? A deletion request must not be reported
 * COMPLETED while one is.
 */
export async function hasOutstandingPersonalObjectPurge(
  patientProfileId: string,
): Promise<boolean> {
  const row = await prisma.outbox.findFirst({
    where: {
      kind: OUTBOX_KIND_PERSONAL_OBJECT_PURGE,
      status: { in: ["PENDING", "PROCESSING", "FAILED"] },
      payload: { path: ["patientProfileId"], equals: patientProfileId },
    },
    select: { id: true },
  });
  return row !== null;
}

/**
 * Durably enqueue a Meta Conversions API Purchase send for a paid order.
 * Idempotent (one row per order), same shape as `enqueueOrderPaidAutomations`.
 * Pass the transaction client so it commits in the SAME transaction as the
 * PAID flip — the dispatcher (below) is where consent/config gating happens,
 * not here, so an order created before this feature shipped (no
 * `adAttribution`) still gets a row that the dispatcher then skips.
 */
export async function enqueueMetaCapiPurchase(
  client: OutboxEnqueueClient,
  orderId: string,
): Promise<void> {
  await client.outbox.createMany({
    data: [
      {
        kind: OUTBOX_KIND_META_CAPI_PURCHASE,
        idempotencyKey: `${OUTBOX_KIND_META_CAPI_PURCHASE}:${orderId}`,
        payload: { orderId },
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
  row: { id: string; kind: string; payload: unknown; attempts?: number },
  log: OutboxLog,
): Promise<void> {
  switch (row.kind) {
    case "review_campaign_email": {
      const payload = row.payload as { deliveryId?: unknown } | null;
      if (typeof payload?.deliveryId !== "string") throw new Error("Invalid review delivery payload");
      const { dispatchReviewDelivery } = await import("../review-invites/review-campaign.service.js");
      await dispatchReviewDelivery(payload.deliveryId);
      return;
    }
    case "birthday_coupon_email": {
      const { dispatchBirthdayOffer } = await import("../coupons/birthday-offers.service.js");
      try {
        await dispatchBirthdayOffer(row.payload, (row.attempts ?? 0) + 1);
      } catch {
        // Queries/provider failures can contain recipient data. Delivery detail
        // is recorded separately using fixed, non-identifying messages.
        throw new Error("Birthday email dispatch failed; check the birthday delivery dashboard");
      }
      return;
    }
    case OUTBOX_KIND_PERSONAL_OBJECT_PURGE: {
      const payload = row.payload as { storageKey?: unknown; purged?: unknown } | null;
      // Already deleted on an earlier attempt; the key was scrubbed then.
      if (payload?.purged === true) return;
      const storageKey = payload?.storageKey;
      if (typeof storageKey !== "string" || storageKey.length === 0) {
        throw new Error("personal_object_purge: missing storageKey in payload");
      }
      if (!isPersonalUploadStorageKey(storageKey)) {
        // Never widen this. Failing loudly beats deleting a clinical file:
        // the row retries, then alerts, and nothing is removed.
        throw new Error(
          "personal_object_purge: storage key is outside the personal-upload namespace",
        );
      }
      const { deleteObject } = await import("../../services/object-storage.js");
      try {
        // Idempotent: a missing object is success (object-storage.ts:186).
        await deleteObject(storageKey);
      } catch (error) {
        // The provider's message can embed the key, and this message becomes
        // Outbox.lastError, a log line and an ops alert. Replace it.
        throw new Error(
          `personal_object_purge: object deletion failed (${
            error instanceof Error ? error.name : "unknown error"
          })`,
        );
      }
      // The object is gone, so the queue must stop holding a key that points
      // at a patient's identity document.
      await prisma.outbox.update({
        where: { id: row.id },
        data: { payload: { purged: true } },
      });
      return;
    }
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
    case OUTBOX_KIND_META_CAPI_PURCHASE: {
      const payload = row.payload as { orderId?: string } | null;
      if (!payload?.orderId) throw new Error("meta_capi_purchase: missing orderId in payload");
      const { dispatchMetaCapiPurchaseForOrder } = await import(
        "../orders/meta-capi-dispatch.service.js"
      );
      await dispatchMetaCapiPurchaseForOrder(payload.orderId);
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

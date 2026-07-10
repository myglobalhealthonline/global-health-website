import { prisma } from "../db/prisma.js";
import { runPrePaymentReminderCron } from "../modules/automation/pre-payment-flow.service.js";
import { runPostPaymentReminderCron } from "../modules/automation/post-payment-flow.service.js";
import {
  cancelAfterGrace,
  sendDueRenewalReminders,
  sweepExpiredReservations,
} from "../modules/subscriptions/ops/sweep.service.js";
import { runReconciliation } from "../modules/subscriptions/ops/reconciliation.service.js";
import {
  alertOnReconciliation,
  emitOpsAlert,
  setOpsAlertLogger,
} from "../modules/subscriptions/ops/ops-alert.js";
import { purgeExpiredAccountDeletions } from "../modules/auth/auth.service.js";

type Logger = { info: (msg: string) => void; error: (msg: string) => void };

const PRE_PAYMENT_INTERVAL_MS = 15 * 60 * 1000; // 15 min
const POST_PAYMENT_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const SUBSCRIPTION_OPS_INTERVAL_MS = 5 * 60 * 1000; // 5 min — reservation sweep + cancel-after-grace
const RECONCILIATION_INTERVAL_MS = 60 * 60 * 1000; // hourly — money/ops invariants (§39)
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h — renewal reminders (24h dedup window)
const ACCOUNT_PURGE_INTERVAL_MS = 60 * 60 * 1000; // hourly — S-017 GDPR grace-period purge

// Distinct advisory-lock keys, one per job, so only one replica runs a given
// tick when horizontally scaled. Single-replica (today) always acquires → no
// behavior change.
const LOCK_PRE_PAYMENT = 4010001;
const LOCK_POST_PAYMENT = 4010002;
const LOCK_SUBSCRIPTION_OPS = 4010003;
const LOCK_RECONCILIATION = 4010004;
const LOCK_DAILY_REMINDERS = 4010005;
const LOCK_ACCOUNT_PURGE = 4010006;

// Interactive-transaction timeout for a locked tick. Generous relative to the
// shortest cron interval (5 min) because job bodies make outbound HTTP calls
// (email/WhatsApp) between DB queries while the lock is held.
const JOB_TX_TIMEOUT_MS = 5 * 60 * 1000;

async function withAdvisoryLock(
  key: number,
  fn: () => Promise<void>,
  opts: { failClosed: boolean },
): Promise<void> {
  // pg_try_advisory_xact_lock is non-blocking AND transaction-scoped: Prisma's
  // interactive $transaction pins one physical pooled connection for the whole
  // callback, so the lock acquire (and its automatic release on commit/
  // rollback) can never split across two different connections the way two
  // separate $queryRaw calls could. No explicit unlock call needed.
  try {
    await prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${key}) AS locked`;
        if (rows?.[0]?.locked !== true) return; // another replica is running this tick
        await fn();
      },
      { timeout: JOB_TX_TIMEOUT_MS },
    );
  } catch {
    // Lock/transaction machinery itself failed (DB blip, pool exhaustion —
    // NOT a job-logic error, every tick already swallows those internally).
    if (opts.failClosed) {
      // Non-idempotent job (would double-send emails/WhatsApp on a concurrent
      // duplicate run) — fail CLOSED: skip this tick rather than run unprotected.
      return;
    }
    // Idempotent job (documented safe-to-retry / no-op-on-duplicate) — fail
    // OPEN as before so a transient lock-query blip doesn't stall it.
    await fn();
  }
}

async function tickPrePayment(log: Logger) {
  // Non-idempotent: sends patient/doctor email+WhatsApp per reminder stage,
  // gated only by an in-loop DB read-then-write (no per-order row lock) — a
  // concurrent duplicate run can re-send the same stage. Fail CLOSED.
  await withAdvisoryLock(
    LOCK_PRE_PAYMENT,
    async () => {
      try {
        const r = await runPrePaymentReminderCron();
        log.info(`[cron] pre-payment: candidates=${r.candidates} processed=${r.processed} sent=${r.sent}`);
      } catch (err) {
        log.error(`[cron] pre-payment error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    { failClosed: true },
  );
}

async function tickPostPayment(log: Logger) {
  // Non-idempotent: same stage-based email/WhatsApp send pattern as pre-payment.
  // Fail CLOSED.
  await withAdvisoryLock(
    LOCK_POST_PAYMENT,
    async () => {
      try {
        const r = await runPostPaymentReminderCron();
        log.info(`[cron] post-payment: candidates=${r.candidates} meetingLink=${r.meetingLinkSent} 1h=${r.oneHourSent} 5min=${r.fiveMinSent}`);
      } catch (err) {
        log.error(`[cron] post-payment error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    { failClosed: true },
  );
}

async function tickSubscriptionOps(log: Logger) {
  // Idempotent by design (sweep.service.ts): reservation release has a
  // terminal-uniqueness guard (never double-frees a credit) and
  // cancelAfterGrace is a plain updateMany with no customer email — a
  // duplicate concurrent run is a safe no-op. Fail OPEN.
  await withAdvisoryLock(
    LOCK_SUBSCRIPTION_OPS,
    async () => {
      try {
        const [sweep, grace] = await Promise.all([sweepExpiredReservations(), cancelAfterGrace()]);
        log.info(
          `[cron] subs-ops: released c=${sweep.consultationReleased} w=${sweep.wellnessReleased} canceledAfterGrace=${grace.canceled}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error(`[cron] subs-ops error: ${msg}`);
        void emitOpsAlert({ severity: "critical", title: "Subscription ops sweep failed", detail: msg });
      }
    },
    { failClosed: false },
  );
}

async function tickReconciliation(log: Logger) {
  // Read-only drift/invariant report + alert emission (reconciliation.service.ts
  // is explicitly documented idempotent) — no money movement or customer
  // messaging. Fail OPEN.
  await withAdvisoryLock(
    LOCK_RECONCILIATION,
    async () => {
      try {
        const report = await runReconciliation();
        log.info(
          `[cron] recon: drift=${report.drift.length} invariants=${report.invariantAlerts.length} priceSync=${report.priceSyncFailures.length}`,
        );
        await alertOnReconciliation(report);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error(`[cron] recon error: ${msg}`);
        void emitOpsAlert({ severity: "critical", title: "Subscription reconciliation failed", detail: msg });
      }
    },
    { failClosed: false },
  );
}

async function tickDailyReminders(log: Logger) {
  // Non-idempotent: sendDueRenewalReminders relies on running exactly once/day
  // (24h-wide match window, no schema dedup field per sweep.service.ts) — a
  // concurrent duplicate run emails the same subscriber twice. Fail CLOSED.
  await withAdvisoryLock(
    LOCK_DAILY_REMINDERS,
    async () => {
      try {
        const { remindersSent } = await sendDueRenewalReminders();
        log.info(`[cron] renewal-reminders: sent=${remindersSent}`);
      } catch (err) {
        log.error(`[cron] renewal-reminders error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    { failClosed: true },
  );
}

async function tickAccountPurge(log: Logger) {
  // Idempotent: candidates are `isActive:true && deletionScheduledAt < now`,
  // and purging flips isActive to false — a purged row drops out of the
  // candidate set, so a concurrent/duplicate run on the same row is a safe
  // no-op (re-anonymizing already-anonymized scalar fields). No customer
  // email/WhatsApp is sent. Fail OPEN.
  await withAdvisoryLock(
    LOCK_ACCOUNT_PURGE,
    async () => {
      try {
        const { purged, failed } = await purgeExpiredAccountDeletions();
        if (purged || failed) log.info(`[cron] account-purge: purged=${purged} failed=${failed}`);
      } catch (err) {
        log.error(`[cron] account-purge error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    { failClosed: false },
  );
}

/** No-op stop handle — returned when the scheduler never actually started
 *  (RUN_SCHEDULER=false), so callers can unconditionally invoke the
 *  returned function on shutdown without an extra null check. */
const NOOP_STOP = () => {};

/**
 * Starts the cron scheduler and returns a `stop()` function that clears
 * every timer (S-022). Node's `clearTimeout`/`clearInterval` operate on
 * the same internal timer list, so a single `clearTimeout` call cancels
 * either kind — no need to track which helper created which handle.
 */
export function startInternalScheduler(log: Logger): () => void {
  // Default ON unless explicitly disabled: single-replica deployments (today's
  // setup) need zero config, while horizontal scaling can set
  // RUN_SCHEDULER=false on extra replicas to avoid duplicate cron work (no
  // distributed lock exists yet).
  if (process.env.RUN_SCHEDULER === "false") {
    log.info("[cron] internal scheduler disabled via RUN_SCHEDULER=false");
    return NOOP_STOP;
  }

  setOpsAlertLogger({ warn: (m) => log.info(m), error: (m) => log.error(m) });
  log.info(
    "[cron] internal scheduler — pre-payment 15m, post-payment 5m, subs-ops 5m, reconciliation 60m, renewal-reminders 24h, account-purge 60m",
  );

  const timers: NodeJS.Timeout[] = [];

  // Random startup jitter so a rolling deploy's overlapping old/new processes
  // don't fire their immediate boot ticks in lockstep.
  const startupJitterMs = Math.random() * 5000;
  timers.push(
    setTimeout(() => {
      // Run the safe ticks once on boot so a deploy doesn't wait a full interval.
      // Renewal reminders are NOT run on boot (the 24h dedup window means a deploy
      // mid-window could double-send) — they fire only on the daily interval, and
      // POST /api/cron/subscriptions/daily remains the robust external trigger.
      // Account purge IS safe on boot — idempotent, no dedup window.
      void tickPrePayment(log);
      void tickPostPayment(log);
      void tickSubscriptionOps(log);
      void tickReconciliation(log);
      void tickAccountPurge(log);
    }, startupJitterMs),
  );

  timers.push(setInterval(() => void tickPrePayment(log), PRE_PAYMENT_INTERVAL_MS));
  timers.push(setInterval(() => void tickPostPayment(log), POST_PAYMENT_INTERVAL_MS));
  timers.push(setInterval(() => void tickSubscriptionOps(log), SUBSCRIPTION_OPS_INTERVAL_MS));
  timers.push(setInterval(() => void tickAccountPurge(log), ACCOUNT_PURGE_INTERVAL_MS));
  timers.push(setInterval(() => void tickReconciliation(log), RECONCILIATION_INTERVAL_MS));
  timers.push(setInterval(() => void tickDailyReminders(log), DAILY_INTERVAL_MS));

  return () => {
    for (const t of timers) clearTimeout(t);
  };
}

import { pool } from "../db/prisma.js";
import {
  runPrePaymentCancelSweep,
  runPrePaymentReminderCron,
  runWebCheckoutAbandonNudge,
} from "../modules/automation/pre-payment-flow.service.js";
import { runPostPaymentReminderCron } from "../modules/automation/post-payment-flow.service.js";
import { runDoctorNoShowCheckCron } from "../modules/automation/doctor-no-show-check.service.js";
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
import { runOutboxDispatch } from "../modules/outbox/outbox.js";
import { runMembershipExpiryJob } from "../modules/memberships/membership-expiry.job.js";
import { runRetentionSweepReport } from "../modules/data-policy/country-data-policy.service.js";
import { dispatchDueTrustpilotInvites } from "../modules/review-invites/review-invite.service.js";
import { runSuklCertificateMonitor } from "../modules/sukl/sukl-certificate-monitor.service.js";

type Logger = { info: (msg: string) => void; error: (msg: string) => void };

const PRE_PAYMENT_INTERVAL_MS = 15 * 60 * 1000; // 15 min — reminder stages only
// 60s — payment-deadline cancels. Deliberately NOT folded back into the
// pre-payment tick: that tick's body can run for minutes behind the WhatsApp
// sender's 6s serialization, and an order waiting on it stays live past its
// deadline. Urgent bookings have a 5-minute pay window, so the enforcement
// interval has to be well under that.
const PRE_PAYMENT_CANCEL_INTERVAL_MS = 60 * 1000;
const POST_PAYMENT_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const SUBSCRIPTION_OPS_INTERVAL_MS = 5 * 60 * 1000; // 5 min — reservation sweep + cancel-after-grace
const RECONCILIATION_INTERVAL_MS = 60 * 60 * 1000; // hourly — money/ops invariants (§39)
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h — renewal reminders (24h dedup window)
const ACCOUNT_PURGE_INTERVAL_MS = 60 * 60 * 1000; // hourly — S-017 GDPR grace-period purge
const OUTBOX_INTERVAL_MS = 30 * 1000; // 30s — drain durable post-payment side effects (P-006/P-007)
const DATA_RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h — Task 1d report-only sweep
// Hourly — Trustpilot review invites whose 24h post-consultation delay has
// elapsed. The delay lives on the ReviewInvite row, so this interval only sets
// how punctually a due invite goes out, never whether it does.
const TRUSTPILOT_INVITES_INTERVAL_MS = 60 * 60 * 1000;
// 24h — SÚKL communication-certificate expiry watch. Daily is plenty: the
// warn bands are 60/30/14/7 days out and the job is a no-op when the
// integration is unconfigured.
const SUKL_CERTIFICATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
// 60s — doctor no-show check fires as soon as an appointment crosses
// scheduledAt+5min; a coarser interval would blur that "+5min" precision.
const DOCTOR_NO_SHOW_INTERVAL_MS = 60 * 1000;

// Distinct advisory-lock keys, one per job, so only one replica runs a given
// tick when horizontally scaled. Single-replica (today) always acquires → no
// behavior change.
const LOCK_PRE_PAYMENT = 4010001;
const LOCK_POST_PAYMENT = 4010002;
const LOCK_SUBSCRIPTION_OPS = 4010003;
const LOCK_RECONCILIATION = 4010004;
const LOCK_DAILY_REMINDERS = 4010005;
const LOCK_ACCOUNT_PURGE = 4010006;
const LOCK_OUTBOX = 4010007;
const LOCK_PRE_PAYMENT_CANCEL = 4010008;
const LOCK_DATA_RETENTION = 4010009;
const LOCK_TRUSTPILOT_INVITES = 4010010;
const LOCK_SUKL_CERTIFICATE = 4010011;
const LOCK_MEMBERSHIP_EXPIRY = 4010012;
const LOCK_DOCTOR_NO_SHOW = 4010013;

// SESSION-level advisory lock (pg_advisory_lock / pg_advisory_unlock) on a
// single manually-checked-out `pg.Pool` client, NOT a Prisma-managed
// transaction. A session-level lock's lifetime is tied to a real physical
// connection, so it lasts exactly as long as the job body actually runs —
// however long that turns out to be — with no artificial timeout to race.
//
// This replaces an earlier transaction-scoped (`pg_try_advisory_xact_lock`)
// version that wrapped the whole job body in `prisma.$transaction(..., {
// timeout: 5 * 60_000 })`. Job bodies call `sendWhatsAppText` per recipient,
// which is globally serialized behind a 6s minimum gap plus 10s/20s retry
// backoffs (wasender.ts) — a tick with enough reminders could run past the
// transaction's 5-minute timeout. When that fired, Prisma rolled the
// transaction back and freed the connection, but the still-running job body
// wasn't actually cancelled — it kept executing (and kept sending WhatsApp
// messages) detached from the now-released lock, while the NEXT tick could
// already acquire that lock and start a fully concurrent duplicate run. A
// session-level lock on a client the job body itself holds for its entire
// duration closes that hole: nothing releases the lock out from under a
// still-running job.
async function withAdvisoryLock(
  key: number,
  fn: () => Promise<void>,
  opts: { failClosed: boolean },
): Promise<void> {
  let client: import("pg").PoolClient;
  try {
    client = await pool.connect();
  } catch {
    // Couldn't even check out a connection to attempt the lock (pool
    // exhaustion, DB blip) — same "can't attempt to lock" case as the query
    // throwing below.
    if (opts.failClosed) return;
    await fn();
    return;
  }

  let locked: boolean;
  try {
    const result = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1) AS locked",
      [key],
    );
    locked = result.rows[0]?.locked === true;
  } catch {
    // Lock-acquisition query itself failed — we don't know if we hold the
    // lock, so treat the connection as untrustworthy and destroy it rather
    // than returning it to the pool.
    client.release(true);
    if (opts.failClosed) return;
    await fn();
    return;
  }

  if (!locked) {
    // Another replica/process already holds this job's lock — nothing to do.
    client.release();
    return;
  }

  try {
    await fn();
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [key]);
      client.release();
    } catch {
      // Unlock failed for some reason (network blip, etc.) — never let a
      // connection that might still be holding the lock go back into the
      // pool for another caller to reuse. Destroy it instead; the lock dies
      // with the connection either way (session-scoped).
      client.release(true);
    }
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

async function tickPrePaymentCancel(log: Logger) {
  // Non-idempotent: sends the patient/doctor "reservation cancelled" pair per
  // order. The cancel itself is a conditional update that only one caller can
  // win, so a duplicate run re-sends nothing — but fail CLOSED anyway, since
  // its own lock is what makes a 60s interval safe against a slow tick.
  await withAdvisoryLock(
    LOCK_PRE_PAYMENT_CANCEL,
    async () => {
      try {
        const r = await runPrePaymentCancelSweep();
        // Silent on empty sweeps — at 60s this logs 1440x/day otherwise.
        if (r.cancelled > 0) {
          log.info(`[cron] pre-payment cancel: candidates=${r.candidates} cancelled=${r.cancelled}`);
        }
        // Website-checkout abandonment rides this tick, not the 15-minute
        // reminder tick: its whole window is 15 minutes wide. Runs after the
        // cancels so an already-due order is torn down before we nudge anyone.
        const nudge = await runWebCheckoutAbandonNudge();
        if (nudge.sent > 0) {
          log.info(`[cron] web-checkout abandon: candidates=${nudge.candidates} sent=${nudge.sent}`);
        }
      } catch (err) {
        log.error(
          `[cron] pre-payment cancel error: ${err instanceof Error ? err.message : String(err)}`,
        );
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

async function tickDoctorNoShow(log: Logger) {
  // Non-idempotent: sends the doctor an email+WhatsApp nudge. The send is
  // guarded by an atomic per-appointment claim (updateMany WHERE
  // doctorNoShowNotifiedAt IS NULL) so a concurrent duplicate run can't
  // double-send the same appointment — but fail CLOSED anyway, matching
  // every other send-bearing job on this scheduler.
  await withAdvisoryLock(
    LOCK_DOCTOR_NO_SHOW,
    async () => {
      try {
        const r = await runDoctorNoShowCheckCron();
        if (r.notified > 0 || r.unknown > 0) {
          log.info(
            `[cron] doctor-no-show: candidates=${r.candidates} checked=${r.checked} notified=${r.notified} unknown=${r.unknown}`,
          );
        }
      } catch (err) {
        log.error(`[cron] doctor-no-show error: ${err instanceof Error ? err.message : String(err)}`);
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
  // Idempotent: candidates are `deletionScheduledAt < now` regardless of
  // isActive (so a row deactivated by an admin after requesting deletion
  // still gets purged) — purgeOneAccount itself short-circuits a row whose
  // User.email already matches the purge sentinel, so a concurrent/duplicate
  // run on the same row is a safe no-op. No customer email/WhatsApp is sent.
  // Fail OPEN.
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

async function tickMembershipExpiry(log: Logger) {
  // Idempotent: the expiry pass is an updateMany filtered on status ACTIVE, and
  // the reconciliation pass releases through refundAllowanceUnit, whose
  // `${orderItemId}:REFUND` key makes a second run a no-op. No customer email.
  // Fail OPEN — pricing re-checks term dates live (§5.4), so a skipped run
  // cannot leak a benefit; it only leaves a stale badge for a day.
  await withAdvisoryLock(
    LOCK_MEMBERSHIP_EXPIRY,
    async () => {
      try {
        const r = await runMembershipExpiryJob();
        if (r.expired > 0 || r.reconciledUnits > 0) {
          log.info(
            `[cron] membership-expiry: expired=${r.expired} dependents=${r.dependentsExpired} reconciled=${r.reconciledUnits}`,
          );
        }
        // A non-zero count means one of §7's release sites leaked a unit and
        // the backstop had to repair it. The repair is safe; the leak is not,
        // and it will keep happening until someone looks.
        if (r.reconciledUnits > 0) {
          void emitOpsAlert({
            severity: "warning",
            title: "Membership allowance units released by reconciliation",
            detail: `${r.reconciledUnits} allowance unit(s) were still held against CANCELLED orders and have been returned. One of the release paths in §7 is not firing.`,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error(`[cron] membership-expiry error: ${msg}`);
        void emitOpsAlert({ severity: "warning", title: "Membership expiry job failed", detail: msg });
      }
    },
    { failClosed: false },
  );
}

async function tickOutboxDispatch(log: Logger) {
  // Idempotent by construction: each row's dispatch is claimed via an atomic
  // PENDING->PROCESSING updateMany inside runOutboxDispatch, so even a
  // concurrent duplicate tick can't double-dispatch the same row. Fail OPEN.
  await withAdvisoryLock(
    LOCK_OUTBOX,
    async () => {
      try {
        const r = await runOutboxDispatch(log);
        if (r.processed > 0) {
          log.info(`[cron] outbox: processed=${r.processed} sent=${r.sent} failed=${r.failed}`);
        }
      } catch (err) {
        log.error(`[cron] outbox error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    { failClosed: false },
  );
}

async function tickDataRetention(log: Logger) {
  // Read-only report (counts + one SecurityAlert, dedupe'd per UTC day) — no
  // deletion, no customer messaging. Fail OPEN.
  await withAdvisoryLock(
    LOCK_DATA_RETENTION,
    async () => {
      try {
        const { totalOverRetention } = await runRetentionSweepReport();
        if (totalOverRetention > 0) {
          log.info(`[cron] data-retention sweep: ${totalOverRetention} record(s) past retention (alert raised)`);
        }
      } catch (err) {
        log.error(`[cron] data-retention sweep error: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    { failClosed: false },
  );
}

async function tickTrustpilotInvites(log: Logger) {
  // Non-idempotent: each due row causes Trustpilot to email a patient, and the
  // row is only stamped `dispatchedAt` AFTER that send returns — so two
  // concurrent runs could invite the same patient twice. Fail CLOSED.
  await withAdvisoryLock(
    LOCK_TRUSTPILOT_INVITES,
    async () => {
      try {
        const r = await dispatchDueTrustpilotInvites();
        // Silent on empty ticks — most hours have nothing due.
        if (r.scanned > 0) {
          log.info(
            `[cron] trustpilot-invites: scanned=${r.scanned} sent=${r.sent} retrying=${r.retrying} skipped=${r.skipped} quotaLeft=${r.quotaRemaining}`,
          );
        }
      } catch (err) {
        log.error(
          `[cron] trustpilot-invites error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    { failClosed: true },
  );
}

async function tickSuklCertificate(log: Logger) {
  // Read-only: validates the SÚKL certificate, refreshes the facility mirror row
  // and raises an ops alert as it crosses 60/30/14/7 days. The alert is deduped
  // per band on the row itself, so a duplicate run cannot double-alert. Fail
  // OPEN — certificate monitoring must never take the scheduler down.
  await withAdvisoryLock(
    LOCK_SUKL_CERTIFICATE,
    async () => {
      try {
        const r = await runSuklCertificateMonitor();
        // Silent when the integration is dark, which is every non-CZ deployment.
        if (r.ran) {
          log.info(
            `[cron] sukl-certificate: daysUntilExpiry=${r.daysUntilExpiry ?? "n/a"} alerted=${r.alerted ?? false} problem=${r.problemCode ?? "none"}`,
          );
        }
      } catch (err) {
        log.error(
          `[cron] sukl-certificate error: ${err instanceof Error ? err.message : String(err)}`,
        );
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
    "[cron] internal scheduler — pre-payment 15m, post-payment 5m, subs-ops 5m, reconciliation 60m, renewal-reminders 24h, account-purge 60m, outbox 30s, data-retention 24h, trustpilot-invites 60m, sukl-certificate 24h, doctor-no-show 60s",
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
      void tickPrePaymentCancel(log);
      void tickPostPayment(log);
      void tickSubscriptionOps(log);
      void tickReconciliation(log);
      void tickAccountPurge(log);
      void tickOutboxDispatch(log);
      // Safe on boot: a row is only due once its stored 24h delay has passed,
      // and the advisory lock keeps a rolling deploy's overlapping processes
      // from both dispatching it.
      void tickTrustpilotInvites(log);
      // Safe on boot and useful there: a deploy that ships a bad certificate
      // should say so immediately rather than 24h later.
      void tickSuklCertificate(log);
      // Safe on boot: idempotent, and a deploy is exactly when a stale ACTIVE
      // badge or a leaked allowance unit is most likely to be noticed.
      void tickMembershipExpiry(log);
      // Safe on boot: the per-appointment doctorNoShowNotifiedAt guard means
      // a redeploy can't double-notify — and it's exactly when a missed
      // check during the previous process's downtime should get caught up.
      void tickDoctorNoShow(log);
    }, startupJitterMs),
  );

  timers.push(setInterval(() => void tickPrePayment(log), PRE_PAYMENT_INTERVAL_MS));
  timers.push(
    setInterval(() => void tickPrePaymentCancel(log), PRE_PAYMENT_CANCEL_INTERVAL_MS),
  );
  timers.push(setInterval(() => void tickPostPayment(log), POST_PAYMENT_INTERVAL_MS));
  timers.push(setInterval(() => void tickSubscriptionOps(log), SUBSCRIPTION_OPS_INTERVAL_MS));
  timers.push(setInterval(() => void tickAccountPurge(log), ACCOUNT_PURGE_INTERVAL_MS));
  timers.push(setInterval(() => void tickReconciliation(log), RECONCILIATION_INTERVAL_MS));
  timers.push(setInterval(() => void tickDailyReminders(log), DAILY_INTERVAL_MS));
  timers.push(setInterval(() => void tickOutboxDispatch(log), OUTBOX_INTERVAL_MS));
  timers.push(setInterval(() => void tickDataRetention(log), DATA_RETENTION_INTERVAL_MS));
  timers.push(
    setInterval(() => void tickTrustpilotInvites(log), TRUSTPILOT_INVITES_INTERVAL_MS),
  );
  timers.push(setInterval(() => void tickSuklCertificate(log), SUKL_CERTIFICATE_INTERVAL_MS));
  timers.push(setInterval(() => void tickMembershipExpiry(log), DAILY_INTERVAL_MS));
  timers.push(setInterval(() => void tickDoctorNoShow(log), DOCTOR_NO_SHOW_INTERVAL_MS));

  return () => {
    for (const t of timers) clearTimeout(t);
  };
}

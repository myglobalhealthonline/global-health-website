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

type Logger = { info: (msg: string) => void; error: (msg: string) => void };

const PRE_PAYMENT_INTERVAL_MS = 15 * 60 * 1000; // 15 min
const POST_PAYMENT_INTERVAL_MS = 5 * 60 * 1000; // 5 min
const SUBSCRIPTION_OPS_INTERVAL_MS = 5 * 60 * 1000; // 5 min — reservation sweep + cancel-after-grace
const RECONCILIATION_INTERVAL_MS = 60 * 60 * 1000; // hourly — money/ops invariants (§39)
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h — renewal reminders (24h dedup window)

async function tickPrePayment(log: Logger) {
  try {
    const r = await runPrePaymentReminderCron();
    log.info(`[cron] pre-payment: candidates=${r.candidates} processed=${r.processed} sent=${r.sent}`);
  } catch (err) {
    log.error(`[cron] pre-payment error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function tickPostPayment(log: Logger) {
  try {
    const r = await runPostPaymentReminderCron();
    log.info(`[cron] post-payment: candidates=${r.candidates} meetingLink=${r.meetingLinkSent} 1h=${r.oneHourSent} 5min=${r.fiveMinSent}`);
  } catch (err) {
    log.error(`[cron] post-payment error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function tickSubscriptionOps(log: Logger) {
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
}

async function tickReconciliation(log: Logger) {
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
}

async function tickDailyReminders(log: Logger) {
  try {
    const { remindersSent } = await sendDueRenewalReminders();
    log.info(`[cron] renewal-reminders: sent=${remindersSent}`);
  } catch (err) {
    log.error(`[cron] renewal-reminders error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function startInternalScheduler(log: Logger) {
  // Default ON unless explicitly disabled: single-replica deployments (today's
  // setup) need zero config, while horizontal scaling can set
  // RUN_SCHEDULER=false on extra replicas to avoid duplicate cron work (no
  // distributed lock exists yet).
  if (process.env.RUN_SCHEDULER === "false") {
    log.info("[cron] internal scheduler disabled via RUN_SCHEDULER=false");
    return;
  }

  setOpsAlertLogger({ warn: (m) => log.info(m), error: (m) => log.error(m) });
  log.info(
    "[cron] internal scheduler — pre-payment 15m, post-payment 5m, subs-ops 5m, reconciliation 60m, renewal-reminders 24h",
  );

  // Random startup jitter so a rolling deploy's overlapping old/new processes
  // don't fire their immediate boot ticks in lockstep.
  const startupJitterMs = Math.random() * 5000;
  setTimeout(() => {
    // Run the safe ticks once on boot so a deploy doesn't wait a full interval.
    // Renewal reminders are NOT run on boot (the 24h dedup window means a deploy
    // mid-window could double-send) — they fire only on the daily interval, and
    // POST /api/cron/subscriptions/daily remains the robust external trigger.
    void tickPrePayment(log);
    void tickPostPayment(log);
    void tickSubscriptionOps(log);
    void tickReconciliation(log);
  }, startupJitterMs);

  setInterval(() => void tickPrePayment(log), PRE_PAYMENT_INTERVAL_MS);
  setInterval(() => void tickPostPayment(log), POST_PAYMENT_INTERVAL_MS);
  setInterval(() => void tickSubscriptionOps(log), SUBSCRIPTION_OPS_INTERVAL_MS);
  setInterval(() => void tickReconciliation(log), RECONCILIATION_INTERVAL_MS);
  setInterval(() => void tickDailyReminders(log), DAILY_INTERVAL_MS);
}

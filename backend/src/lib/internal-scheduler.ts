import { runPrePaymentReminderCron } from "../modules/automation/pre-payment-flow.service.js";
import { runPostPaymentReminderCron } from "../modules/automation/post-payment-flow.service.js";

type Logger = { info: (msg: string) => void; error: (msg: string) => void };

const PRE_PAYMENT_INTERVAL_MS = 15 * 60 * 1000; // 15 min
const POST_PAYMENT_INTERVAL_MS = 5 * 60 * 1000;  // 5 min

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

export function startInternalScheduler(log: Logger) {
  log.info("[cron] internal scheduler starting — pre-payment every 15 min, post-payment every 5 min");

  // Run once immediately on boot so a deploy doesn't wait a full interval.
  void tickPrePayment(log);
  void tickPostPayment(log);

  setInterval(() => void tickPrePayment(log), PRE_PAYMENT_INTERVAL_MS);
  setInterval(() => void tickPostPayment(log), POST_PAYMENT_INTERVAL_MS);
}

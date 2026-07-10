import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { startInternalScheduler } from "./lib/internal-scheduler.js";
import { getBillingPort } from "./modules/billing/billing.factory.js";
import { disconnectDb } from "./db/prisma.js";

// S-022: force-exit ceiling for graceful shutdown. Railway (and most
// orchestrators) send SIGTERM then SIGKILL after their own grace window —
// this keeps our own drain bounded well under that so we exit cleanly on
// our terms rather than getting SIGKILLed mid-drain.
const SHUTDOWN_TIMEOUT_MS = 25_000;

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ host: "0.0.0.0", port: env.PORT });
    const stopScheduler = startInternalScheduler({
      info: (msg) => app.log.info(msg),
      error: (msg) => app.log.error(msg),
    });

    // B1: warn loudly when a production deploy is running the in-memory fake
    // billing driver — subscriptions would serve dead checkout URLs. The
    // money-path entrypoints hard-fail (assertBillingConfigured), but the boot
    // log makes the misconfiguration visible before a customer ever hits it.
    if (env.NODE_ENV === "production" && getBillingPort().driver === "fake") {
      app.log.warn(
        "BILLING MISCONFIGURED: fake billing driver active in production. " +
          "Set BILLING_DRIVER=stripe and STRIPE_SECRET_KEY to enable real subscription billing.",
      );
    }

    // S-022: graceful shutdown. Stop the cron scheduler first (no new job
    // ticks), let Fastify drain in-flight requests and stop accepting new
    // ones (`app.close()` does both), then close the DB pool. A hard
    // timeout force-exits if any step hangs, so a rolling deploy or manual
    // restart can never wedge the container indefinitely.
    let shuttingDown = false;
    async function shutdown(signal: NodeJS.Signals) {
      if (shuttingDown) return;
      shuttingDown = true;
      app.log.info(`[shutdown] received ${signal} — draining`);

      const forceExit = setTimeout(() => {
        app.log.error(`[shutdown] did not complete within ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`);
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      forceExit.unref();

      try {
        stopScheduler();
        await app.close();
        await disconnectDb();
        app.log.info("[shutdown] complete");
        clearTimeout(forceExit);
        process.exit(0);
      } catch (err) {
        app.log.error(
          `[shutdown] error while draining: ${err instanceof Error ? err.message : String(err)}`,
        );
        clearTimeout(forceExit);
        process.exit(1);
      }
    }

    process.on("SIGTERM", () => void shutdown("SIGTERM"));
    process.on("SIGINT", () => void shutdown("SIGINT"));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void start();

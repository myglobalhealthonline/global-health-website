import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { startInternalScheduler } from "./lib/internal-scheduler.js";
import { getBillingPort } from "./modules/billing/billing.factory.js";

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ host: "0.0.0.0", port: env.PORT });
    startInternalScheduler({
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
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void start();

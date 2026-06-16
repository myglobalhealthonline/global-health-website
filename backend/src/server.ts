import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { startInternalScheduler } from "./lib/internal-scheduler.js";

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ host: "0.0.0.0", port: env.PORT });
    startInternalScheduler({
      info: (msg) => app.log.info(msg),
      error: (msg) => app.log.error(msg),
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void start();

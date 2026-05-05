import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ host: "0.0.0.0", port: env.PORT });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void start();

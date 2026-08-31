import cluster from "node:cluster";
import { env } from "./config/env.js";

/**
 * Cluster-aware process entry point (replaces server.js as Railway's
 * startCommand). CLUSTER_WORKERS=1 (default) is a pure passthrough to
 * server.ts — every existing single-process deployment is unaffected.
 * Set CLUSTER_WORKERS>1 to fork that many worker processes in this
 * container, each running its own copy of the Fastify app bound to the
 * same port; Node's cluster module load-balances incoming connections
 * across them.
 *
 * See CLUSTER_WORKERS in config/env.ts for the REDIS_URL / DB_POOL_MAX /
 * WhatsApp-send-gap prerequisites before turning this on in production.
 */

const WORKER_SHUTDOWN_GRACE_MS = 27_000;

function runPrimary(): void {
  const workerCount = env.CLUSTER_WORKERS;
  console.error(`[cluster] primary ${process.pid} forking ${workerCount} worker(s)`);

  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  let shuttingDown = false;

  cluster.on("exit", (worker, code, signal) => {
    if (shuttingDown) return;
    console.error(
      `[cluster] worker ${worker.process.pid} exited (code=${code}, signal=${signal}) — forking replacement`,
    );
    cluster.fork();
  });

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    const workers = Object.values(cluster.workers ?? {});
    console.error(`[cluster] received ${signal} — relaying to ${workers.length} worker(s)`);

    const exits = workers.map(
      (worker) =>
        new Promise<void>((resolve) => {
          if (!worker) {
            resolve();
            return;
          }
          worker.once("exit", () => resolve());
          worker.process.kill(signal);
        }),
    );

    await Promise.race([
      Promise.all(exits),
      new Promise<void>((resolve) => setTimeout(resolve, WORKER_SHUTDOWN_GRACE_MS)),
    ]);
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

if (env.CLUSTER_WORKERS > 1 && cluster.isPrimary) {
  runPrimary();
} else {
  void import("./server.js");
}

import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { classifyDatabaseConnectivityError } from "../modules/shared/db-errors.js";

/** S-022b: bounded readiness — a wedged DB connection must not hang the
 *  check (and pile up concurrent probes) indefinitely. */
const READY_DB_TIMEOUT_MS = 3000;

async function checkDb(): Promise<{ connected: true } | { connected: false; code: string }> {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_resolve, reject) => {
        const t = setTimeout(() => reject(new Error("readiness DB check timed out")), READY_DB_TIMEOUT_MS);
        t.unref();
      }),
    ]);
    return { connected: true };
  } catch (error) {
    return { connected: false, code: classifyDatabaseConnectivityError(error) };
  }
}

const healthRoute: FastifyPluginAsync = async (app) => {
  // S-022b: liveness — "is the process up". No DB round-trip, always fast,
  // so a DB outage never makes the orchestrator think the PROCESS itself
  // needs restarting.
  app.get("/live", async () => {
    return { ok: true, message: "Backend is running." };
  });

  // S-022b: readiness — "can this instance actually serve traffic". Checks
  // DB connectivity with a bounded timeout; a rolling deploy should hold
  // traffic back from an instance whose DB check fails here rather than
  // routing to a DB-dead process.
  app.get("/ready", async (request, reply) => {
    const database = await checkDb();
    if (!database.connected) {
      return reply.status(503).send({ ok: false, message: "Database connection failed.", database });
    }
    return { ok: true, message: "Backend is ready.", database };
  });

  // Legacy combined endpoint — kept for existing external monitors/scripts.
  // Same behavior as before: fast/no-DB by default, DB-checked only when
  // ?db=1 is passed. New callers should use /live or /ready directly.
  app.get("/health", async (request, reply) => {
    const q = request.query as { db?: string };
    const includeDb = q.db === "1" || q.db === "true";

    if (!includeDb) {
      return { ok: true, message: "Backend is running." };
    }

    const database = await checkDb();
    if (!database.connected) {
      return reply.status(503).send({ ok: false, message: "Database connection failed.", database });
    }
    return { ok: true, message: "Backend is running.", database };
  });
};

export default healthRoute;

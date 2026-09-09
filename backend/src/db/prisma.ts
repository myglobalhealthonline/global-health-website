import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { env } from "../config/env.js";
import { resolveDbPoolBudget } from "./pool-budget.js";
import { createContextualClient, WorkloadContext } from "./workload-context.js";

/**
 * Single PrismaClient per process. In dev under `tsx watch`, the module
 * is re-imported on every HMR reload — without the `globalThis` cache
 * each reload leaks a fresh `pg.Pool` and Prisma engine, eventually
 * exhausting Postgres connections.
 */
type GlobalWithPrisma = typeof globalThis & {
  __prisma?: PrismaClient;
  __schedulerPrisma?: PrismaClient;
  __prismaPool?: Pool;
  __schedulerPrismaPool?: Pool;
  __schedulerLockPool?: Pool;
  __numberingPool?: Pool;
};

const g = globalThis as GlobalWithPrisma;

// Prisma workload pool. Scheduler advisory locks use schedulerLockPool below
// so an external delivery wait never holds a request-pool lock connection.
// Each cluster worker (see ../cluster.ts) is a separate OS process with its
// own module registry, so each gets its own independent workload pools. This
// file keeps their combined Prisma workload capacity within DB_POOL_MAX; other
// deliberately separate pools have their own connection budget.
// Unset DB_POOL_MAX divides the historical single-process budget (10) by
// the worker count instead of multiplying it, so the default stays safe.
const workloadBudget = resolveDbPoolBudget({
  dbPoolMax: env.DB_POOL_MAX,
  clusterWorkers: env.CLUSTER_WORKERS,
  schedulerDbPoolMax: env.SCHEDULER_DB_POOL_MAX,
});

export const pool =
  g.__prismaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Explicit pool sizing (P-018) — previously library defaults (pg's
    // default max is 10 anyway, but idle/connect timeouts were unbounded,
    // so a stalled connection attempt or a leaked idle client could hang
    // or starve the pool indefinitely). Sized for a small-to-medium app on
    // a single Railway instance.
    max: workloadBudget.request,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Per-statement ceiling so one runaway query can't hold a pooled
    // connection forever and starve the rest of the app.
    statement_timeout: 15_000,
  });

/**
 * Session advisory locks deliberately use a small, separate pool. A slow
 * scheduled job keeps its lock client checked out for the whole job; sharing
 * that client with request queries allowed cron work to consume request-pool
 * capacity. This pool is only for lock sessions, never Prisma queries.
 *
 * Deployment must budget DB_POOL_MAX + SCHEDULER_LOCK_POOL_MAX +
 * NUMBERING_POOL_MAX per worker, plus other database consumers.
 */
export const schedulerLockPool =
  g.__schedulerLockPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: env.SCHEDULER_LOCK_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
  });

/** Raw counter transactions stay out of Prisma pools: callers may already hold an interactive Prisma transaction. */
export const numberingPool =
  g.__numberingPool ?? new Pool({
    connectionString: process.env.DATABASE_URL,
    max: env.NUMBERING_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
  });

/** Configured per-worker capacity, not a claim about database-wide usage. */
export const dbPoolCapacity = {
  request: workloadBudget.request,
  scheduler: workloadBudget.scheduler,
  schedulerLocks: env.SCHEDULER_LOCK_POOL_MAX,
  numbering: env.NUMBERING_POOL_MAX,
  total: workloadBudget.total + env.SCHEDULER_LOCK_POOL_MAX + env.NUMBERING_POOL_MAX,
};

const prismaClient =
  g.__prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
  });

// A one-connection deployment cannot isolate scheduler traffic without
// starving requests. In that case scheduler work safely uses the request
// client instead of opening a connection beyond DB_POOL_MAX.
export const schedulerPool = workloadBudget.scheduler > 0
  ? g.__schedulerPrismaPool ?? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: workloadBudget.scheduler,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 15_000,
    })
  : pool;

const schedulerPrismaClient = workloadBudget.scheduler > 0
  ? g.__schedulerPrisma ?? new PrismaClient({ adapter: new PrismaPg(schedulerPool) })
  : prismaClient;

const workloadContext = new WorkloadContext(prismaClient, schedulerPrismaClient);

/** Run a scheduler tick with the scheduler Prisma client selected. */
export function runWithSchedulerDb<T>(work: () => T): T {
  return workloadContext.runScheduler(work);
}

if (process.env.NODE_ENV !== "production") {
  g.__prisma = prismaClient;
  g.__schedulerPrisma = schedulerPrismaClient;
  g.__prismaPool = pool;
  g.__schedulerPrismaPool = schedulerPool;
  g.__schedulerLockPool = schedulerLockPool;
  g.__numberingPool = numberingPool;
}

// Existing imports keep using `prisma`; the proxy binds every delegate,
// raw-query method, and both $transaction forms to the context-selected client.
export const prisma = createContextualClient(workloadContext) as PrismaClient;

/**
 * S-022: graceful shutdown needs to close both the Prisma engine AND the
 * underlying `pg.Pool` — the pool is constructed and owned here (outside
 * Prisma's driver-adapter lifecycle), so `prisma.$disconnect()` alone does
 * not guarantee the pool's sockets are released. Idempotent-ish: a second
 * call just gets rejected/no-ops by the underlying libs, which is fine for
 * a process that's exiting anyway.
 */
export async function disconnectDb(): Promise<void> {
  await prismaClient.$disconnect().catch(() => {});
  if (schedulerPrismaClient !== prismaClient) await schedulerPrismaClient.$disconnect().catch(() => {});
  await pool.end().catch(() => {});
  if (schedulerPool !== pool) await schedulerPool.end().catch(() => {});
  await schedulerLockPool.end().catch(() => {});
  await numberingPool.end().catch(() => {});
}

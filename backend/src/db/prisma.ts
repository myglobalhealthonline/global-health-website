import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

/**
 * Single PrismaClient per process. In dev under `tsx watch`, the module
 * is re-imported on every HMR reload — without the `globalThis` cache
 * each reload leaks a fresh `pg.Pool` and Prisma engine, eventually
 * exhausting Postgres connections.
 */
type GlobalWithPrisma = typeof globalThis & {
  __prisma?: PrismaClient;
  __prismaPool?: Pool;
};

const g = globalThis as GlobalWithPrisma;

const pool =
  g.__prismaPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Explicit pool sizing (P-018) — previously library defaults (pg's
    // default max is 10 anyway, but idle/connect timeouts were unbounded,
    // so a stalled connection attempt or a leaked idle client could hang
    // or starve the pool indefinitely). Sized for a small-to-medium app on
    // a single Railway instance.
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Per-statement ceiling so one runaway query can't hold a pooled
    // connection forever and starve the rest of the app.
    statement_timeout: 15_000,
  });

const prismaClient =
  g.__prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
  });

if (process.env.NODE_ENV !== "production") {
  g.__prisma = prismaClient;
  g.__prismaPool = pool;
}

export const prisma = prismaClient;

/**
 * S-022: graceful shutdown needs to close both the Prisma engine AND the
 * underlying `pg.Pool` — the pool is constructed and owned here (outside
 * Prisma's driver-adapter lifecycle), so `prisma.$disconnect()` alone does
 * not guarantee the pool's sockets are released. Idempotent-ish: a second
 * call just gets rejected/no-ops by the underlying libs, which is fine for
 * a process that's exiting anyway.
 */
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect().catch(() => {});
  await pool.end().catch(() => {});
}

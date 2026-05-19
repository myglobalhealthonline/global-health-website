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

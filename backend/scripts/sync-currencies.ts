/**
 * Idempotent upsert of the currencies the platform supports.
 * Run after pulling new currency codes so admin dropdowns include them.
 *
 *   pnpm exec tsx scripts/sync-currencies.ts
 */
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(here, "..", ".env") });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CURRENCIES: { code: string; symbol: string; decimals?: number }[] = [
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "USD", symbol: "$" },
  { code: "CZK", symbol: "Kč" },
  { code: "BRL", symbol: "R$" },
  { code: "RON", symbol: "lei" },
  { code: "PLN", symbol: "zł" },
];

async function main() {
  for (const c of CURRENCIES) {
    const row = await prisma.currency.upsert({
      where: { code: c.code },
      update: { symbol: c.symbol },
      create: { code: c.code, symbol: c.symbol, decimals: c.decimals ?? 2 },
    });
    console.log(`  ✓ ${row.code}  ${row.symbol}`);
  }
  console.log(`\nSynced ${CURRENCIES.length} currencies.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

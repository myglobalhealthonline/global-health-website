/**
 * One-shot Postgres connection probe.
 *   pnpm --filter backend exec tsx --env-file=.env scripts/check-db.ts
 */
import { prisma } from "../src/index.js";

async function main() {
  const t = Date.now();
  const rows = await prisma.$queryRaw<
    { db: string; usr: string; ver: string }[]
  >`SELECT current_database() AS db, current_user AS usr, version() AS ver`;
  console.log(`✓ Connected in ${Date.now() - t}ms`);
  console.log(rows[0]);
}

main()
  .catch((e) => {
    console.error("✗ Connection failed");
    console.error(e?.code ? `  code=${e.code}` : "");
    console.error(`  ${e?.message ?? e}`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

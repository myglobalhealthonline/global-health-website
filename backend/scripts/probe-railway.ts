import { prisma } from "../src/index.js";

async function main() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log(`Tables (${tables.length}):`);
  for (const t of tables) console.log(`  - ${t.tablename}`);

  if (tables.length === 0) {
    console.log("\n→ DB is empty. Safe to apply fresh migration.");
    return;
  }

  console.log("\nRow counts:");
  for (const { tablename } of tables) {
    try {
      const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint AS count FROM "${tablename}"`,
      );
      console.log(`  ${tablename.padEnd(36)} ${rows[0].count}`);
    } catch (e) {
      console.log(`  ${tablename.padEnd(36)} (err: ${(e as Error).message.slice(0, 60)})`);
    }
  }
}

main()
  .catch((e) => {
    console.error("Probe failed:", e?.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

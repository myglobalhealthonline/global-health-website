/**
 * Probes the live DB for admin accounts you can log in with.
 *
 * Run:
 *   pnpm --filter backend exec tsx --env-file=.env scripts/check-admins.ts
 */
import { prisma } from "../src/db/prisma.js";

async function main() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log(`Tables (${tables.length}):`);
  for (const t of tables) console.log(`  - ${t.tablename}`);

  if (tables.some((t) => t.tablename === "User")) {
    const users = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    console.log(`\nAdmin accounts (${users.length}):`);
    for (const u of users) {
      console.log(`  - ${u.email}  (${u.fullName}, active=${u.isActive}, since ${u.createdAt.toISOString().slice(0, 10)})`);
    }
  }
}

main()
  .catch((e) => {
    console.error("Probe failed:", e?.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

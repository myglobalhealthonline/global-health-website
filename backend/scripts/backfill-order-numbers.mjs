import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
config({ path: join(root, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry");

const { prisma } = await import("../src/db/prisma.ts");

async function main() {
  const missing = await prisma.order.findMany({
    where: { orderNumber: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true },
  });

  console.log(`[backfill-order-numbers] ${missing.length} order(s) without orderNumber`);

  let seq = 0;
  const counter = await prisma.orderCounter.findUnique({ where: { id: 1 } });
  if (counter) seq = counter.lastSeq;

  for (const order of missing) {
    seq += 1;
    const orderNumber = `ORD-${seq.toString().padStart(6, "0")}`;
    console.log(`${order.id} → ${orderNumber}`);
    if (!DRY_RUN) {
      await prisma.order.update({
        where: { id: order.id },
        data: { orderNumber },
      });
    }
  }

  if (!DRY_RUN && missing.length > 0) {
    await prisma.orderCounter.upsert({
      where: { id: 1 },
      update: { lastSeq: seq },
      create: { id: 1, lastSeq: seq },
    });
  }

  console.log(`[backfill-order-numbers] done — counter=${seq}${DRY_RUN ? " (dry run)" : ""}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

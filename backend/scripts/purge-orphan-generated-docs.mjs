import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const DRY = process.argv.includes("--dry");
const { prisma } = await import("../src/db/prisma.ts");
const { purgeOrphanGeneratedDocuments } = await import(
  "../src/modules/generated-documents/generated-documents.service.ts"
);

const appointments = await prisma.generatedDocument.findMany({
  distinct: ["appointmentId"],
  select: { appointmentId: true },
});

let total = 0;
for (const { appointmentId } of appointments) {
  if (DRY) {
    console.log("Would purge orphans for", appointmentId);
    continue;
  }
  const n = await purgeOrphanGeneratedDocuments(appointmentId);
  if (n > 0) console.log(`Purged ${n} orphan(s) for appointment ${appointmentId}`);
  total += n;
}

console.log(DRY ? "Dry run complete" : `Done — removed ${total} orphan document row(s)`);
await prisma.$disconnect();

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

/**
 * Pre-launch cutover: delete future OPEN/BLOCKED DoctorTimeSlot rows so they
 * regenerate under the new clinic-local timezone math on the next availability
 * request. BOOKED + HELD slots (bound to appointments / carts) are left
 * untouched so existing bookings keep their instant.
 *
 * Why a script and not lazy regeneration: slot generation uses
 * `createMany({ skipDuplicates: true })` keyed on `@@unique([doctorId, startAt])`.
 * Stale OPEN rows at the OLD (UTC-interpreted) instants would linger beside the
 * new correct ones, so they must be removed explicitly, once, at cutover.
 *
 * Future BLOCKED ("busy") marks on derived slots are reset — acceptable
 * pre-launch. Run once after deploying the timezone change:
 *
 *   node scripts/regenerate-future-open-slots.mjs
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const now = new Date();
  const result = await prisma.doctorTimeSlot.deleteMany({
    where: {
      status: { in: ["OPEN", "BLOCKED"] },
      startAt: { gte: now },
    },
  });
  console.log(
    `Deleted ${result.count} future OPEN/BLOCKED slot(s). They regenerate on the next availability request under the clinic-local timezone.`,
  );
}

main()
  .catch((err) => {
    console.error("Regeneration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

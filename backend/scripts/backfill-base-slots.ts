import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import {
  bulkSetSlotBlockInRange,
  ensureSlotsForRange,
} from "../src/modules/doctor-availability/doctor-availability.service.js";

/**
 * Backfill: re-cut future doctor availability to the new BASE GRID.
 *
 * Context: slots used to be pre-cut at the window's fixed `slotDurationMinutes`
 * (often 30). The booking model is now "base grid + consume" — the day is cut
 * into small base slots (default 15) and a consultation consumes consecutive
 * base slots for its real length. Existing FUTURE, UNBOOKED slots are still at
 * the old coarse size, which would (a) over-book a short consult onto a big
 * slot and (b) not tile cleanly. This script deletes those and re-materialises
 * base slots, preserving BLOCKED time-off.
 *
 * What it does, per doctor with availability windows:
 *   1. Capture future BLOCKED spans (time-off) so we can re-apply them.
 *   2. Delete all future OPEN + BLOCKED slots (startAt > now). BOOKED / HELD
 *      rows are LEFT UNTOUCHED — they carry live appointments / cart holds at
 *      their real geometry and re-materialise to base on release.
 *   3. Re-materialise base slots across the horizon (ensureSlotsForRange).
 *   4. Re-apply each captured BLOCKED span.
 *
 * Idempotent: re-running just re-cuts the same future window. Run AFTER
 * deploying the base-grid + consume change.
 *
 *   pnpm tsx scripts/backfill-base-slots.ts --dry
 *   pnpm tsx scripts/backfill-base-slots.ts
 *   pnpm tsx scripts/backfill-base-slots.ts --days=90
 */

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry");
const HORIZON_DAYS = Number(
  args.find((a) => a.startsWith("--days="))?.split("=")[1] ?? "60",
);

async function main() {
  const now = new Date();
  const horizonEnd = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

  const doctors = await prisma.doctor.findMany({
    where: { availabilities: { some: {} } },
    select: { id: true, fullName: true },
  });

  console.log(
    `${DRY_RUN ? "[DRY] " : ""}Backfilling base-grid slots for ${doctors.length} doctor(s), horizon ${HORIZON_DAYS}d (until ${horizonEnd.toISOString()})`,
  );

  let totalDeleted = 0;
  let totalReblocked = 0;

  for (const doc of doctors) {
    // 1. Capture future BLOCKED spans (time-off) to re-apply after re-cut.
    const blocked = await prisma.doctorTimeSlot.findMany({
      where: {
        doctorId: doc.id,
        status: "BLOCKED",
        startAt: { gt: now },
      },
      select: { startAt: true, endAt: true, blockReason: true },
      orderBy: { startAt: "asc" },
    });

    // 2. Count / delete future OPEN + BLOCKED (leave BOOKED / HELD).
    const doomed = await prisma.doctorTimeSlot.count({
      where: {
        doctorId: doc.id,
        status: { in: ["OPEN", "BLOCKED"] },
        startAt: { gt: now },
      },
    });

    console.log(
      `  ${doc.fullName}: delete ${doomed} future OPEN/BLOCKED, re-block ${blocked.length} time-off span(s)`,
    );
    totalDeleted += doomed;
    totalReblocked += blocked.length;

    if (DRY_RUN) continue;

    await prisma.doctorTimeSlot.deleteMany({
      where: {
        doctorId: doc.id,
        status: { in: ["OPEN", "BLOCKED"] },
        startAt: { gt: now },
      },
    });

    // 3. Re-materialise base slots across the horizon.
    await ensureSlotsForRange(doc.id, now, horizonEnd);

    // 4. Re-apply captured BLOCKED spans (blocks OPEN base slots in range).
    for (const b of blocked) {
      await bulkSetSlotBlockInRange(
        doc.id,
        b.startAt,
        b.endAt,
        "BLOCK",
        b.blockReason ?? null,
      );
    }
  }

  // Post-check: no exclusion overlap should exist (constraint would have
  // rejected inserts; this is a belt-and-braces count of overlapping pairs).
  const overlaps = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "DoctorTimeSlot" a
    JOIN "DoctorTimeSlot" b
      ON a."doctorId" = b."doctorId"
     AND a."id" <> b."id"
     AND a."status" <> 'BLOCKED'
     AND b."status" <> 'BLOCKED'
     AND tsrange(a."startAt", a."endAt") && tsrange(b."startAt", b."endAt")
  `;
  const overlapCount = Number(overlaps[0]?.count ?? 0);

  console.log(
    `${DRY_RUN ? "[DRY] " : ""}Done. ${totalDeleted} slots ${DRY_RUN ? "would be" : ""} deleted, ${totalReblocked} time-off span(s) ${DRY_RUN ? "would be" : ""} re-applied. Overlapping (non-blocked) pairs: ${overlapCount}.`,
  );
  if (overlapCount > 0) {
    console.warn(
      "WARNING: overlapping slots detected — investigate before relying on availability.",
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

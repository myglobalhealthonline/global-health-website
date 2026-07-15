/**
 * Post-migration fixups for how OLD appointments render in the PATIENT bookings
 * view (/account/bookings) and doctor dashboard:
 *   1. createdAt := the real old booking date (registrationDate/bookingStartTime/
 *      source createdAt) so the list — ordered by createdAt desc — shows newest
 *      first and the migrated ones fall to the bottom (chronological).
 *   2. paymentStatus := PAID for migrated non-cancelled appts, so the patient is
 *      NOT prompted to "Complete payment" on historical bookings
 *      (requiresPayment() = amountCents>0 && paymentStatus!=="PAID").
 *   3. userId := the patient's User (by email) so the appts show in their
 *      bookings immediately (otherwise only claimed on next login).
 *
 *   DUMP_DIR=... DRY_RUN=false node --import tsx scripts/legacy-migration/fix-appointment-dates.ts
 * Idempotent.
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { requireDumpDir, DRY_RUN, banner } from "./lib/config.js";
import { readCollection, hasCollection } from "./lib/source.js";
import { Counter } from "./lib/report.js";

function toDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function main() {
  requireDumpDir();
  banner("fix-appointment-view");
  const c = new Counter();

  // 2. paymentStatus -> PAID for migrated non-cancelled (bulk, fast)
  if (!DRY_RUN) {
    const pay = await prisma.appointment.updateMany({
      where: { legacyMongoId: { not: null }, status: { not: "CANCELLED" } },
      data: { paymentStatus: "PAID" },
    });
    console.log(`  paymentStatus -> PAID on ${pay.count} migrated appts (no more 'complete payment')`);
  }

  // preload Users by email for userId linking
  const userByEmail = new Map<string, string>();
  {
    const take = 1000;
    let cursor: string | undefined;
    for (;;) {
      const rows = await prisma.user.findMany({
        take, orderBy: { id: "asc" }, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: { id: true, email: true },
      });
      if (rows.length === 0) break;
      for (const r of rows) userByEmail.set(r.email.toLowerCase(), r.id);
      cursor = rows[rows.length - 1].id;
      if (rows.length < take) break;
    }
  }

  // 1 + 3. per-appointment createdAt + userId from the source dump
  if (!hasCollection("Appointments")) {
    console.log("  no Appointments export — skipping date/user backfill");
  } else {
    for await (const doc of readCollection("Appointments")) {
      const legacyId = typeof doc._id === "string" ? doc._id : String(doc._id ?? "");
      if (!legacyId) continue;
      c.bump("read");
      const when =
        toDate(doc.registrationDate) ?? toDate(doc.createdAt) ?? toDate(doc.bookingStartTime);
      const email = (typeof doc.email === "string" ? doc.email : "").trim().toLowerCase();
      const userId = email ? userByEmail.get(email) : undefined;
      if (!when && !userId) {
        c.bump("nothing-to-set");
        continue;
      }
      if (DRY_RUN) {
        c.bump("would-fix");
        continue;
      }
      const data: { createdAt?: Date; userId?: string } = {};
      if (when) data.createdAt = when;
      if (userId) data.userId = userId;
      const res = await prisma.appointment.updateMany({ where: { legacyMongoId: legacyId }, data });
      if (res.count > 0) c.bump("fixed");
      else c.bump("not-in-db");
    }
  }

  console.log(`\nfix-appointment-view done: ${c.summary()}`);
}

main().catch((e) => { console.error("fix failed:", e); process.exit(1); }).finally(() => prisma.$disconnect());

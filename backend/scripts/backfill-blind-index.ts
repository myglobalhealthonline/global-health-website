/**
 * One-time / re-runnable backfill: populate the PatientProfile blind-index
 * columns (emailHash / phoneHash / nameDobHash) used for duplicate detection,
 * once BLIND_INDEX_KEY has been set.
 *
 *   BLIND_INDEX_KEY=<key> pnpm --filter backend ts scripts/backfill-blind-index.ts
 *
 * Idempotent: only rows whose computed hash differs from the stored value are
 * written, so it is safe to re-run. Refuses to do anything when the key is not
 * configured (the compute functions return null — there'd be nothing to write).
 *
 * Privacy: logs counts and row IDs only — never raw email / phone / name.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import {
  computeEmailBlindIndex,
  computePhoneBlindIndex,
  computeNameDobBlindIndex,
} from "../src/lib/blind-index.js";

const BATCH_SIZE = 200;

async function main() {
  // Guard: the compute functions key off BLIND_INDEX_KEY directly. Without it
  // every hash is null and the backfill would be a confusing no-op, so bail
  // early with a clear message and a clean exit.
  const key = process.env.BLIND_INDEX_KEY?.trim();
  if (!key || key.length < 32) {
    console.log(
      "BLIND_INDEX_KEY is not set (or shorter than 32 chars) — nothing to backfill. Exiting.",
    );
    return;
  }

  let processed = 0;
  let updated = 0;
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.patientProfile.findMany({
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        dateOfBirth: true,
        emailHash: true,
        phoneHash: true,
        nameDobHash: true,
      },
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      processed += 1;

      const emailHash = computeEmailBlindIndex(row.email);
      const phoneHash = row.phone ? computePhoneBlindIndex(row.phone) : null;
      const nameDobHash =
        row.fullName && row.dateOfBirth
          ? computeNameDobBlindIndex(row.fullName, row.dateOfBirth)
          : null;

      // Only write columns whose computed value differs from what's stored.
      const data: Record<string, string | null> = {};
      if (emailHash !== row.emailHash) data.emailHash = emailHash;
      if (phoneHash !== row.phoneHash) data.phoneHash = phoneHash;
      if (nameDobHash !== row.nameDobHash) data.nameDobHash = nameDobHash;

      if (Object.keys(data).length > 0) {
        await prisma.patientProfile.update({ where: { id: row.id }, data });
        updated += 1;
        console.log(`updated profile id=${row.id} (${Object.keys(data).join(", ")})`);
      }
    }

    cursor = rows[rows.length - 1].id;
    console.log(`progress: processed=${processed} updated=${updated}`);

    if (rows.length < BATCH_SIZE) break;
  }

  console.log(
    `Blind-index backfill complete: ${updated}/${processed} profile row(s) updated.`,
  );
}

main()
  .catch((err) => {
    console.error("Blind-index backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

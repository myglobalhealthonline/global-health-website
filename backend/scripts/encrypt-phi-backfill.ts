/**
 * One-time backfill: encrypt existing plaintext PatientProfile government-ID
 * fields (nationalIdNumber / taxIdNumber / passportNumber) once
 * PHI_ENCRYPTION_KEY has been set.
 *
 *   PHI_ENCRYPTION_KEY=<key> pnpm --filter backend ts scripts/encrypt-phi-backfill.ts
 *
 * Idempotent: values already in the `phi:v1:` envelope are skipped, so it is
 * safe to re-run. Refuses to run when the key is not configured (it would be
 * a no-op and silently leave data in plaintext).
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import {
  encryptPhi,
  isPhiEncryptionEnabled,
  PHI_ENCRYPTED_FIELDS,
} from "../src/lib/crypto/phi-crypto.js";

async function main() {
  if (!isPhiEncryptionEnabled()) {
    throw new Error(
      "PHI_ENCRYPTION_KEY is not set — refusing to run (would be a no-op).",
    );
  }

  const rows = await prisma.patientProfile.findMany({
    select: {
      id: true,
      nationalIdNumber: true,
      taxIdNumber: true,
      passportNumber: true,
    },
  });

  let updated = 0;
  for (const row of rows) {
    const data: Record<string, string> = {};
    for (const field of PHI_ENCRYPTED_FIELDS) {
      const current = row[field];
      if (!current || current.startsWith("phi:v1:")) continue; // null or already encrypted
      const enc = encryptPhi(current);
      if (enc && enc !== current) data[field] = enc;
    }
    if (Object.keys(data).length > 0) {
      await prisma.patientProfile.update({ where: { id: row.id }, data });
      updated += 1;
    }
  }

  console.log(`PHI backfill complete: ${updated}/${rows.length} profile row(s) encrypted.`);
}

main()
  .catch((err) => {
    console.error("PHI backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

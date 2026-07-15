/**
 * Read-only: confirm the local PHI_ENCRYPTION_KEY matches the one the live app
 * encrypted existing rows with. Finds one already-encrypted PatientProfile field
 * and attempts to decrypt it. Prints PASS/FAIL only — never the decrypted value.
 *
 *   node --import tsx scripts/legacy-migration/check-phi-key.ts
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { decryptPhi, isPhiEncryptionEnabled } from "../../src/lib/crypto/phi-crypto.js";

async function main() {
  if (!isPhiEncryptionEnabled()) {
    console.log("PHI_ENCRYPTION_KEY not set locally — cannot check.");
    return;
  }

  const row = await prisma.patientProfile.findFirst({
    where: {
      OR: [
        { nationalIdNumber: { startsWith: "phi:v1:" } },
        { taxIdNumber: { startsWith: "phi:v1:" } },
        { passportNumber: { startsWith: "phi:v1:" } },
      ],
    },
    select: { id: true, nationalIdNumber: true, taxIdNumber: true, passportNumber: true },
  });

  if (!row) {
    console.log(
      "No existing phi:v1: encrypted rows in the live DB yet — nothing to compare against.\n" +
        "Either no patient has an ID stored, or prod is still plaintext. If prod already\n" +
        "has this key set, you're fine; just make sure it's the SAME value you pasted here.",
    );
    return;
  }

  const cipher = row.nationalIdNumber?.startsWith("phi:v1:")
    ? row.nationalIdNumber
    : row.taxIdNumber?.startsWith("phi:v1:")
      ? row.taxIdNumber
      : row.passportNumber;

  try {
    const clear = decryptPhi(cipher);
    const ok = typeof clear === "string" && clear.length > 0;
    console.log(
      ok
        ? `PASS — local PHI_ENCRYPTION_KEY decrypts existing prod data (row ${row.id}, ${clear!.length} chars). Key matches.`
        : `INCONCLUSIVE — decrypt returned empty for row ${row.id}.`,
    );
  } catch (err) {
    console.error(
      `FAIL — local PHI_ENCRYPTION_KEY does NOT match the key that encrypted row ${row.id}. ` +
        `Do not run the patient load with this key. (${(err as Error).message})`,
    );
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error("check failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

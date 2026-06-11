/**
 * One-off, idempotent backfill: ensure every PATIENT user has a
 * PatientProfile, and every PatientProfile has a Global Health Number.
 *
 * Why: registration now creates the profile + issues a GHN, but legacy
 * accounts created before that change (and some seeded accounts) have a
 * User with no PatientProfile. Those accounts 404 on every profile-scoped
 * surface (consents, access log, medical documents, GHN display).
 *
 * Run once after deploy:
 *
 *   npx tsx scripts/backfill-patient-profiles.ts
 *
 * Idempotent: skips users that already have a profile, and only assigns a
 * GHN to profiles missing one. Re-running is safe.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { generateGlobalHealthNumber } from "../src/lib/global-health-number.js";
import { computeEmailBlindIndex, computePhoneBlindIndex } from "../src/lib/blind-index.js";

async function main(): Promise<void> {
  let createdProfiles = 0;
  let assignedGhns = 0;

  // 1. PATIENT users with no PatientProfile → create one (with a GHN).
  const patients = await prisma.user.findMany({
    where: { role: "PATIENT", patientProfile: null },
    select: { id: true, email: true, fullName: true, phone: true },
  });

  for (const u of patients) {
    const ghn = await generateGlobalHealthNumber();
    await prisma.patientProfile.create({
      data: {
        email: u.email,
        userId: u.id,
        fullName: u.fullName,
        phone: u.phone ?? null,
        globalHealthNumber: ghn,
        emailHash: computeEmailBlindIndex(u.email),
        phoneHash: u.phone ? computePhoneBlindIndex(u.phone) : null,
      },
    });
    createdProfiles += 1;
  }

  // 2. Existing profiles missing a GHN (or carrying a temporary fallback
  //    "GH-YYYY-T…" value) → assign a real, sequential number.
  const missing = await prisma.patientProfile.findMany({
    where: {
      OR: [{ globalHealthNumber: null }, { globalHealthNumber: { contains: "-T" } }],
    },
    select: { id: true, globalHealthNumber: true },
  });

  for (const p of missing) {
    const ghn = await generateGlobalHealthNumber();
    await prisma.patientProfile.update({
      where: { id: p.id },
      data: { globalHealthNumber: ghn },
    });
    assignedGhns += 1;
  }

  console.log(
    `[backfill-patient-profiles] created ${createdProfiles} profile(s), ` +
      `assigned ${assignedGhns} GHN(s).`,
  );
}

main()
  .catch((err) => {
    console.error("[backfill-patient-profiles] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

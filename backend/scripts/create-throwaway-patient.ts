/**
 * Creates a throwaway PATIENT for PAT-010 (bypasses HTTP register rate limit).
 * Usage: pnpm exec tsx scripts/create-throwaway-patient.ts [email]
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma.js";

async function main() {
  const email = process.argv[2] ?? `pat010-${Date.now()}@test.local`;
  const passwordHash = await bcrypt.hash("Throwaway10!", 12);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      fullName: "Throwaway Delete",
      role: "PATIENT",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: { passwordHash, isActive: true, emailVerifiedAt: new Date() },
  });

  console.log(email);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

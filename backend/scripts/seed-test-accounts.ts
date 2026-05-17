/**
 * One-off seed: creates a DOCTOR test account (with linked Doctor
 * profile) and a PATIENT test account, both pre-verified, sharing the
 * supplied password. Idempotent — re-runs upsert the rows and reset
 * the password to the requested value.
 *
 *   pnpm --filter backend ts seed:test-accounts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma.js";

const PASSWORD = "GHAdmin2026X7qL9!";
const DOCTOR_EMAIL = "doctor@globalhealthonline.com";
const PATIENT_EMAIL = "patient@globalhealthonline.com";

async function main() {
  // Pick the first active country with a slug as the doctor's home
  // market. Ireland is the canonical seed; if it's gone we fall back
  // to whatever's available so this script never wedges on a fresh DB.
  const country = await prisma.country.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, code: true, name: true },
  });
  if (!country) {
    throw new Error("No active country found — run `prisma db seed` first.");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // ---- Doctor profile (public directory row) ----
  const doctorProfile = await prisma.doctor.upsert({
    where: {
      countryId_slug: {
        countryId: country.id,
        slug: "global-health-doctor",
      },
    },
    create: {
      countryId: country.id,
      slug: "global-health-doctor",
      fullName: "Dr. Global Health",
      title: "General Practitioner",
      bio:
        "Test doctor account for the doctor portal. Replace with a real profile before production.",
      qualifications: ["MB BCh BAO", "MRCPI"],
      languages: ["English"],
      active: true,
    },
    update: {
      // No-op update so upsert returns the existing row when it exists.
      active: true,
    },
  });

  // ---- Doctor login user ----
  const doctorUser = await prisma.user.upsert({
    where: { email: DOCTOR_EMAIL },
    create: {
      email: DOCTOR_EMAIL,
      passwordHash,
      fullName: "Dr. Global Health",
      role: "DOCTOR",
      doctorId: doctorProfile.id,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash,
      role: "DOCTOR",
      doctorId: doctorProfile.id,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  // ---- Patient login user ----
  const patientUser = await prisma.user.upsert({
    where: { email: PATIENT_EMAIL },
    create: {
      email: PATIENT_EMAIL,
      passwordHash,
      fullName: "Global Health Patient",
      role: "PATIENT",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash,
      role: "PATIENT",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log("Seeded test accounts:");
  console.log(
    `  DOCTOR  email=${doctorUser.email}  userId=${doctorUser.id}  doctorProfileId=${doctorProfile.id}  country=${country.code}`,
  );
  console.log(
    `  PATIENT email=${patientUser.email}  userId=${patientUser.id}`,
  );
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

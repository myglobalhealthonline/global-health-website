/**
 * One-off seed: creates a DOCTOR test account (with linked Doctor
 * profile) and a PATIENT test account, both pre-verified, sharing the
 * supplied password. Idempotent — re-runs upsert the rows and reset
 * the password to the requested value.
 *
 *   pnpm --filter backend ts seed:test-accounts
 *
 * Refuses to run when NODE_ENV=production so the test rows can't
 * accidentally appear on the live database.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma.js";

const PASSWORD = "GHAdmin2026X7qL9!";
const DOCTOR_EMAIL = "doctor@globalhealthonline.com";
const PATIENT_EMAIL = "patient@globalhealthonline.com";
// Public-facing name. Deliberately NOT "Dr. Global Health" — that
// reads as the site name and confuses visitors when the test row
// leaks onto the public roster. "Dr. Test Account" makes it obvious
// in the admin UI and on any roster page if it slips through.
const DOCTOR_DISPLAY_NAME = "Dr. Test Account";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "seed-test-accounts refuses to run with NODE_ENV=production — these are test rows only.",
    );
  }

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
      fullName: DOCTOR_DISPLAY_NAME,
      title: "General Practitioner",
      bio:
        "Test doctor account for the doctor portal. Replace with a real profile before production.",
      qualifications: ["MB BCh BAO", "MRCPI"],
      languages: ["English"],
      // Inactive by default so the test row never surfaces on the
      // public country roster. Re-enable manually in /admin/doctors
      // when you actually need to test the public flow.
      active: false,
    },
    update: {
      // Rename any existing row carrying the old "Dr. Global Health"
      // label, and force-deactivate so re-running this script also
      // cleans up an over-eager prior run that left the test row
      // visible to public visitors.
      fullName: DOCTOR_DISPLAY_NAME,
      active: false,
    },
  });

  // ---- Doctor login user ----
  const doctorUser = await prisma.user.upsert({
    where: { email: DOCTOR_EMAIL },
    create: {
      email: DOCTOR_EMAIL,
      passwordHash,
      fullName: DOCTOR_DISPLAY_NAME,
      role: "DOCTOR",
      doctorId: doctorProfile.id,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash,
      fullName: DOCTOR_DISPLAY_NAME,
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

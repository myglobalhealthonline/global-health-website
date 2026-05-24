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
 *
 * Re-run semantics: the UPDATE branches deliberately leave
 * `fullName` and `active` alone so any rename / re-activation an
 * admin or doctor did via their portal is preserved. The script
 * still runs a one-shot legacy-name cleanup at the top to rename
 * rows that are still carrying the original hard-coded
 * "Dr. Global Health" / "Global Health Patient" labels (and to
 * deactivate the doctor row so it doesn't keep leaking onto the
 * public roster). After that one cleanup, every subsequent edit
 * the admin makes is respected.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma.js";

const PASSWORD = "GHAdmin2026X7qL9!";
const DOCTOR_EMAIL = "doctor@globalhealthonline.com";
const PATIENT_EMAIL = "patient@globalhealthonline.com";
// Defaults used only when the rows DON'T EXIST yet. Re-runs do not
// overwrite admin-edited names — see the upsert update branches below.
const DOCTOR_DEFAULT_NAME = "Dr. Test Account";
const PATIENT_DEFAULT_NAME = "Test Patient";
// Legacy names that used to be hard-coded. The cleanup query below
// renames rows still carrying these (and only those) so the public
// roster stops showing "Dr. Global Health" without trampling later
// admin edits.
const LEGACY_DOCTOR_NAMES = ["Dr. Global Health"];
const LEGACY_PATIENT_NAMES = ["Global Health Patient"];

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

  // One-shot legacy cleanup. Only fires on rows that still carry the
  // original hard-coded names — admin-edited rows are filtered out by
  // the `fullName: { in: LEGACY_* }` predicate and stay untouched.
  const renamedDoctors = await prisma.doctor.updateMany({
    where: { slug: "global-health-doctor", fullName: { in: LEGACY_DOCTOR_NAMES } },
    data: { fullName: DOCTOR_DEFAULT_NAME, active: false },
  });
  if (renamedDoctors.count > 0) {
    console.log(
      `  Cleanup: renamed ${renamedDoctors.count} legacy doctor row(s) to "${DOCTOR_DEFAULT_NAME}" and deactivated.`,
    );
  }
  const renamedDoctorUsers = await prisma.user.updateMany({
    where: { email: DOCTOR_EMAIL, fullName: { in: LEGACY_DOCTOR_NAMES } },
    data: { fullName: DOCTOR_DEFAULT_NAME },
  });
  if (renamedDoctorUsers.count > 0) {
    console.log(`  Cleanup: renamed ${renamedDoctorUsers.count} legacy doctor user row(s).`);
  }
  const renamedPatients = await prisma.user.updateMany({
    where: { email: PATIENT_EMAIL, fullName: { in: LEGACY_PATIENT_NAMES } },
    data: { fullName: PATIENT_DEFAULT_NAME },
  });
  if (renamedPatients.count > 0) {
    console.log(`  Cleanup: renamed ${renamedPatients.count} legacy patient row(s).`);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // ---- Doctor profile (public directory row) ----
  // CREATE uses the default name + inactive. UPDATE deliberately omits
  // both `fullName` and `active` so re-runs respect anything an admin
  // changed via /admin/doctors. The doctor portal can rename the
  // attached User row but does not edit Doctor.fullName directly.
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
      fullName: DOCTOR_DEFAULT_NAME,
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
      // No-op — preserves admin-edited fullName / active / etc. The
      // empty update keeps the upsert idempotent so re-runs still
      // return the existing row id.
    },
  });

  // ---- Doctor login user ----
  // UPDATE refreshes the password and re-asserts the role + Doctor
  // linkage (so a misconfigured row is repaired), but leaves
  // `fullName` alone so doctor- or admin-side renames stick.
  const doctorUser = await prisma.user.upsert({
    where: { email: DOCTOR_EMAIL },
    create: {
      email: DOCTOR_EMAIL,
      passwordHash,
      fullName: DOCTOR_DEFAULT_NAME,
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
  // Same shape as the doctor user: refresh password + role, leave
  // fullName alone.
  const patientUser = await prisma.user.upsert({
    where: { email: PATIENT_EMAIL },
    create: {
      email: PATIENT_EMAIL,
      passwordHash,
      fullName: PATIENT_DEFAULT_NAME,
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

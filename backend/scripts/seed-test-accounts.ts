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
 *
 * Security-audit phase 5 (docs/audits/security/audit-authz-matrix-2026-08-02.md)
 * extended this script with fixtures for the remaining four roles, plus a
 * second doctor/patient pair unrelated to the first — so a manual tester or
 * Playwright can log in as any role without hand-crafting rows. The role ×
 * endpoint pass/fail matrix itself lives in
 * backend/src/routes/authz-matrix.test.ts, which creates its own ephemeral,
 * self-cleaning fixtures (the proven pattern from admin-plans.route.test.ts)
 * rather than depending on this script having been run first.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma.js";

// Passwords are read from the environment — never hardcoded. Set
// SEED_DOCTOR_PASSWORD and SEED_PATIENT_PASSWORD (distinct values) before
// running. The script refuses to run if either is missing.
const DOCTOR_PASSWORD = process.env.SEED_DOCTOR_PASSWORD;
const PATIENT_PASSWORD = process.env.SEED_PATIENT_PASSWORD;
const DOCTOR_EMAIL = "doctor@globalhealthonline.com";
const PATIENT_EMAIL = "patient@globalhealthonline.com";

// ---- Phase 5 additions: the remaining four roles + a second, unrelated
// doctor/patient pair for cross-tenant IDOR testing. Each needs its own
// distinct password env var so a leaked/committed value can't unlock more
// than one account.
const SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const LOCAL_ADMIN_PASSWORD = process.env.SEED_LOCAL_ADMIN_PASSWORD;
const CORPORATE_ADMIN_PASSWORD = process.env.SEED_CORPORATE_ADMIN_PASSWORD;
const DOCTOR2_PASSWORD = process.env.SEED_DOCTOR2_PASSWORD;
const PATIENT2_PASSWORD = process.env.SEED_PATIENT2_PASSWORD;
const SUPER_ADMIN_EMAIL = "superadmin@globalhealthonline.com";
const ADMIN_EMAIL = "admin@globalhealthonline.com";
const LOCAL_ADMIN_EMAIL = "localadmin@globalhealthonline.com";
const CORPORATE_ADMIN_EMAIL = "corporateadmin@globalhealthonline.com";
const DOCTOR2_EMAIL = "doctor2@globalhealthonline.com";
const PATIENT2_EMAIL = "patient2@globalhealthonline.com";

// Refuse to run against a production-looking database host. NODE_ENV is not
// enough: the documented local workflow points DATABASE_URL at the Railway
// production proxy while NODE_ENV=development, so guard on the host too.
const PROD_DB_HOST_PATTERNS = [/rlwy\.net/i, /railway\.internal/i, /\.proxy\./i];

function assertNotProductionDatabase(): void {
  if (process.env.FORCE_SEED === "true") return;
  const url = process.env.DATABASE_URL ?? "";
  if (PROD_DB_HOST_PATTERNS.some((pattern) => pattern.test(url))) {
    throw new Error(
      "seed-test-accounts refuses to run: DATABASE_URL points at a production-looking host. " +
        "Set FORCE_SEED=true only if you are certain this is a disposable database.",
    );
  }
}
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
  assertNotProductionDatabase();
  if (!DOCTOR_PASSWORD || !PATIENT_PASSWORD) {
    throw new Error(
      "SEED_DOCTOR_PASSWORD and SEED_PATIENT_PASSWORD must both be set (and distinct) before seeding test accounts.",
    );
  }
  if (DOCTOR_PASSWORD === PATIENT_PASSWORD) {
    throw new Error("SEED_DOCTOR_PASSWORD and SEED_PATIENT_PASSWORD must be different values.");
  }
  const phase5Passwords = {
    SUPER_ADMIN: SUPER_ADMIN_PASSWORD,
    ADMIN: ADMIN_PASSWORD,
    LOCAL_ADMIN: LOCAL_ADMIN_PASSWORD,
    CORPORATE_ADMIN: CORPORATE_ADMIN_PASSWORD,
    DOCTOR2: DOCTOR2_PASSWORD,
    PATIENT2: PATIENT2_PASSWORD,
  };
  for (const [name, value] of Object.entries(phase5Passwords)) {
    if (!value) {
      throw new Error(`SEED_${name}_PASSWORD must be set before seeding test accounts.`);
    }
  }
  const allPasswords = [DOCTOR_PASSWORD, PATIENT_PASSWORD, ...Object.values(phase5Passwords)];
  if (new Set(allPasswords).size !== allPasswords.length) {
    throw new Error("All SEED_*_PASSWORD values must be distinct from each other.");
  }

  // Pick the first active country with a slug as the doctor's home
  // market. Ireland is the canonical seed; if it's gone we fall back
  // to whatever's available so this script never wedges on a fresh DB.
  let country = await prisma.country.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, code: true, name: true },
  });
  if (!country) {
    // No generic "seed base data" script exists in this repo (confirmed
    // while building the phase-5 authz matrix) — a fresh test database has
    // no countries at all. Create a minimal one rather than wedge, so this
    // script is fully self-contained for a CI-provisioned database.
    const currency = await prisma.currency.upsert({
      where: { code: "EUR" },
      create: { code: "EUR", symbol: "€", decimals: 2 },
      update: {},
    });
    country = await prisma.country.create({
      data: {
        code: "ie",
        name: "Ireland",
        slug: "ireland",
        legacyHomePath: "/ireland",
        teamPath: "/ireland/team",
        generalConsultationPath: "/ireland/general-consultation",
        specialistConsultationPath: "/ireland/specialist-consultation",
        currencyId: currency.id,
      },
      select: { id: true, code: true, name: true },
    });
    console.log(`  Created base country: ${country.name} (${country.code}) — none existed.`);
  }
  // A second, distinct country so LOCAL_ADMIN's country-scope restriction
  // (allowedCountryFolders) is actually testable — "can access A, denied B".
  let countryB = await prisma.country.findFirst({
    where: { isActive: true, id: { not: country.id } },
    orderBy: { createdAt: "asc" },
    select: { id: true, code: true, name: true },
  });
  if (!countryB) {
    const currency =
      (await prisma.currency.findUnique({ where: { code: "EUR" } })) ??
      (await prisma.currency.create({ data: { code: "EUR", symbol: "€", decimals: 2 } }));
    countryB = await prisma.country.create({
      data: {
        code: "cz",
        name: "Czechia",
        slug: "czechia",
        legacyHomePath: "/czechia",
        teamPath: "/czechia/team",
        generalConsultationPath: "/czechia/general-consultation",
        specialistConsultationPath: "/czechia/specialist-consultation",
        currencyId: currency.id,
      },
      select: { id: true, code: true, name: true },
    });
    console.log(`  Created second country: ${countryB.name} (${countryB.code}) — for LOCAL_ADMIN scope testing.`);
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

  const doctorPasswordHash = await bcrypt.hash(DOCTOR_PASSWORD, 12);
  const patientPasswordHash = await bcrypt.hash(PATIENT_PASSWORD, 12);

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
      passwordHash: doctorPasswordHash,
      fullName: DOCTOR_DEFAULT_NAME,
      role: "DOCTOR",
      doctorId: doctorProfile.id,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash: doctorPasswordHash,
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
      passwordHash: patientPasswordHash,
      fullName: PATIENT_DEFAULT_NAME,
      role: "PATIENT",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash: patientPasswordHash,
      role: "PATIENT",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  // ---- Second doctor + Doctor profile, in country B, unrelated to the
  // first doctor's patients/appointments — needed to test that doctor B
  // cannot read doctor A's patient records (cross-tenant IDOR).
  const doctor2Profile = await prisma.doctor.upsert({
    where: { countryId_slug: { countryId: countryB.id, slug: "global-health-doctor-2" } },
    create: {
      countryId: countryB.id,
      slug: "global-health-doctor-2",
      fullName: "Dr. Test Account Two",
      title: "General Practitioner",
      bio: "Second test doctor account, unrelated to the first — used for cross-tenant authorization testing.",
      qualifications: ["MB BCh BAO"],
      languages: ["English"],
      active: false,
    },
    update: {},
  });
  const doctor2PasswordHash = await bcrypt.hash(DOCTOR2_PASSWORD!, 12);
  const doctor2User = await prisma.user.upsert({
    where: { email: DOCTOR2_EMAIL },
    create: {
      email: DOCTOR2_EMAIL,
      passwordHash: doctor2PasswordHash,
      fullName: "Dr. Test Account Two",
      role: "DOCTOR",
      doctorId: doctor2Profile.id,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash: doctor2PasswordHash,
      role: "DOCTOR",
      doctorId: doctor2Profile.id,
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  // ---- Second patient, unrelated to the first — same cross-tenant purpose.
  const patient2PasswordHash = await bcrypt.hash(PATIENT2_PASSWORD!, 12);
  const patient2User = await prisma.user.upsert({
    where: { email: PATIENT2_EMAIL },
    create: {
      email: PATIENT2_EMAIL,
      passwordHash: patient2PasswordHash,
      fullName: "Test Patient Two",
      role: "PATIENT",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash: patient2PasswordHash,
      role: "PATIENT",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  // ---- SUPER_ADMIN — same tier as ADMIN, explicit superuser role.
  const superAdminPasswordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD!, 12);
  const superAdminUser = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    create: {
      email: SUPER_ADMIN_EMAIL,
      passwordHash: superAdminPasswordHash,
      fullName: "Test Super Admin",
      role: "SUPER_ADMIN",
      adminScope: "SUPER",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash: superAdminPasswordHash,
      role: "SUPER_ADMIN",
      adminScope: "SUPER",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  // ---- ADMIN — global, unscoped.
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD!, 12);
  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      fullName: "Test Admin",
      role: "ADMIN",
      adminScope: "GLOBAL",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      adminScope: "GLOBAL",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  // ---- LOCAL_ADMIN — scoped to country A only (allowedCountryFolders).
  // Authorization tests assert this account can read country A but is
  // denied country B (S-003, the LOCAL_ADMIN escalation finding).
  const localAdminPasswordHash = await bcrypt.hash(LOCAL_ADMIN_PASSWORD!, 12);
  const localAdminUser = await prisma.user.upsert({
    where: { email: LOCAL_ADMIN_EMAIL },
    create: {
      email: LOCAL_ADMIN_EMAIL,
      passwordHash: localAdminPasswordHash,
      fullName: "Test Local Admin",
      role: "LOCAL_ADMIN",
      adminScope: "LOCAL",
      allowedCountryFolders: [country.code],
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash: localAdminPasswordHash,
      role: "LOCAL_ADMIN",
      adminScope: "LOCAL",
      allowedCountryFolders: [country.code],
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });

  // ---- CORPORATE_ADMIN — needs a linked CorporateCompany (1:1 via
  // CorporateCompany.adminUserId) and a CorporatePlan for that company to
  // reference. Uses its own "test-corporate-standard" plan rather than the
  // production "corporate-standard" slug from seed-corporate-plan.ts, so
  // this script never depends on that one having been run first.
  const corporateAdminPasswordHash = await bcrypt.hash(CORPORATE_ADMIN_PASSWORD!, 12);
  const corporateAdminUser = await prisma.user.upsert({
    where: { email: CORPORATE_ADMIN_EMAIL },
    create: {
      email: CORPORATE_ADMIN_EMAIL,
      passwordHash: corporateAdminPasswordHash,
      fullName: "Test Corporate Admin",
      role: "CORPORATE_ADMIN",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash: corporateAdminPasswordHash,
      role: "CORPORATE_ADMIN",
      isActive: true,
      emailVerifiedAt: new Date(),
    },
  });
  const testCorporatePlan = await prisma.corporatePlan.upsert({
    where: { slug: "test-corporate-standard" },
    create: {
      slug: "test-corporate-standard",
      name: "Test Corporate Standard",
      annualPricePerEmployeeCents: 18000,
      currencyCode: "EUR",
      maxBeneficiariesPerEmployee: 5,
      isActive: true,
    },
    update: {},
  });
  await prisma.corporateCompany.upsert({
    where: { adminUserId: corporateAdminUser.id },
    create: {
      name: "Test Corporate Co",
      countryCode: country.code,
      billingEmail: CORPORATE_ADMIN_EMAIL,
      contactName: "Test Corporate Admin",
      contactEmail: CORPORATE_ADMIN_EMAIL,
      planId: testCorporatePlan.id,
      adminUserId: corporateAdminUser.id,
    },
    update: {},
  });

  console.log("Seeded test accounts:");
  console.log(
    `  DOCTOR          email=${doctorUser.email}  userId=${doctorUser.id}  doctorProfileId=${doctorProfile.id}  country=${country.code}`,
  );
  console.log(`  PATIENT         email=${patientUser.email}  userId=${patientUser.id}`);
  console.log(
    `  DOCTOR2         email=${doctor2User.email}  userId=${doctor2User.id}  doctorProfileId=${doctor2Profile.id}  country=${countryB.code}  (unrelated to DOCTOR, for cross-tenant tests)`,
  );
  console.log(
    `  PATIENT2        email=${patient2User.email}  userId=${patient2User.id}  (unrelated to PATIENT, for cross-tenant tests)`,
  );
  console.log(`  SUPER_ADMIN     email=${superAdminUser.email}  userId=${superAdminUser.id}`);
  console.log(`  ADMIN           email=${adminUser.email}  userId=${adminUser.id}`);
  console.log(
    `  LOCAL_ADMIN     email=${localAdminUser.email}  userId=${localAdminUser.id}  scopedTo=${country.code}  deniedFor=${countryB.code}`,
  );
  console.log(
    `  CORPORATE_ADMIN email=${corporateAdminUser.email}  userId=${corporateAdminUser.id}`,
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

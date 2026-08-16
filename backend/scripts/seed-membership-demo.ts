/**
 * Seeds the fixtures the phase 5 browser pass needs, in ONE country.
 *
 *   - a private membership plan with a single included consultation and a 20%
 *     fallback, plus a linked ACTIVE enrollment for a demo patient;
 *   - a corporate company with a 25% GENERAL rule and a second demo patient as
 *     an ACTIVE employee, so "a corporate member still gets their discount via
 *     pre-selection" can actually be walked.
 *
 * Dry-run by default; `--apply` is required to write anything, because
 * `backend/.env` points at PRODUCTION and this script is the sort of thing
 * that gets re-run from shell history. Intended for `--env-file=.env.dev`.
 *
 * Idempotent: every row is upserted on a natural key, so re-running it after a
 * failed browser pass does not pile up duplicates.
 *
 *   node --env-file=.env.dev --import tsx scripts/seed-membership-demo.ts
 *   node --env-file=.env.dev --import tsx scripts/seed-membership-demo.ts --apply
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/db/prisma.js";

const APPLY = process.argv.includes("--apply");
const COUNTRY_CODE = process.env.SEED_COUNTRY_CODE ?? "ie";
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "Phase5Demo!2026";

const MEMBER_EMAIL = "p5-member@test.local";
const CORPORATE_EMAIL = "p5-corp@test.local";

function log(action: string, detail: unknown) {
  console.log(`${APPLY ? "[apply]" : "[dry-run]"} ${action}`, detail);
}

async function main() {
  const country = await prisma.country.findFirst({
    where: { code: COUNTRY_CODE },
    select: { id: true, code: true, name: true },
  });
  if (!country) throw new Error(`No country ${COUNTRY_CODE}`);

  const service = await prisma.service.findFirst({
    where: { countryId: country.id, kind: "GENERAL", isActive: true },
    orderBy: { basePriceCents: "asc" },
    select: { id: true, slug: true, name: true, basePriceCents: true },
  });
  if (!service) throw new Error(`No active GENERAL service in ${country.code}`);
  log("country + service", { country: country.code, service: service.slug, price: service.basePriceCents });

  if (!APPLY) {
    console.log("\nWould create/update:");
    console.log(`  membership plan  phase5-demo (${country.name})`);
    console.log("  level            gold — ALLOWANCE 1 on GENERAL, 20% fallback");
    console.log(`  member           ${MEMBER_EMAIL} (verified, ACTIVE enrollment)`);
    console.log(`  corporate member ${CORPORATE_EMAIL} (ACTIVE employee, 25% GENERAL)`);
    console.log("\nRe-run with --apply to write.");
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const plan = await prisma.membershipPlan.upsert({
    where: { countryId_slug: { countryId: country.id, slug: "phase5-demo" } },
    update: { isActive: true },
    create: {
      countryId: country.id,
      slug: "phase5-demo",
      name: "Phase 5 Demo Membership",
      internalNotes: "Seeded for the phase 5 browser pass. Safe to delete.",
    },
  });
  const level = await prisma.membershipLevel.upsert({
    where: { planId_slug: { planId: plan.id, slug: "gold" } },
    update: { isActive: true },
    create: {
      planId: plan.id,
      countryId: country.id,
      slug: "gold",
      name: "Gold",
      isDefault: true,
    },
  });
  const benefit = await prisma.membershipBenefit.upsert({
    where: { levelId_serviceKind: { levelId: level.id, serviceKind: "GENERAL" } },
    update: {
      benefitType: "ALLOWANCE",
      allowanceCount: 1,
      fallbackType: "PERCENT",
      fallbackPercent: 20,
      isActive: true,
    },
    create: {
      levelId: level.id,
      countryId: country.id,
      serviceKind: "GENERAL",
      benefitType: "ALLOWANCE",
      allowanceCount: 1,
      fallbackType: "PERCENT",
      fallbackPercent: 20,
    },
  });
  log("membership", { planId: plan.id, levelId: level.id, benefitId: benefit.id });

  const member = await prisma.user.upsert({
    where: { email: MEMBER_EMAIL },
    update: { passwordHash, emailVerifiedAt: new Date(), role: "PATIENT" },
    create: {
      email: MEMBER_EMAIL,
      passwordHash,
      fullName: "Phase Five Member",
      role: "PATIENT",
      emailVerifiedAt: new Date(),
    },
  });
  const existing = await prisma.membershipEnrollment.findFirst({
    where: { planId: plan.id, email: MEMBER_EMAIL },
    select: { id: true },
  });
  const enrollment = existing
    ? await prisma.membershipEnrollment.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", userId: member.id, linkedAt: new Date() },
      })
    : await prisma.membershipEnrollment.create({
        data: {
          planId: plan.id,
          levelId: level.id,
          countryId: country.id,
          membershipId: "P5-DEMO-0001",
          email: MEMBER_EMAIL,
          firstName: "Phase Five",
          lastName: "Member",
          userId: member.id,
          linkedAt: new Date(),
          status: "ACTIVE",
          startDate: new Date("2026-01-01"),
        },
      });
  log("member", { userId: member.id, enrollmentId: enrollment.id });

  const corporatePlan = await prisma.corporatePlan.upsert({
    where: { slug: "phase5-demo-corp" },
    update: { isActive: true },
    create: {
      slug: "phase5-demo-corp",
      name: "Phase 5 Demo Corporate",
      annualPricePerEmployeeCents: 12000,
      currencyCode: "EUR",
    },
  });
  const rule = await prisma.corporateBenefitRule.findFirst({
    where: { corporatePlanId: corporatePlan.id, serviceKind: "GENERAL", serviceId: null },
    select: { id: true },
  });
  if (rule) {
    await prisma.corporateBenefitRule.update({
      where: { id: rule.id },
      data: { discountPercent: 25, isActive: true },
    });
  } else {
    await prisma.corporateBenefitRule.create({
      data: {
        corporatePlanId: corporatePlan.id,
        serviceKind: "GENERAL",
        discountPercent: 25,
        appliesToBeneficiaries: true,
      },
    });
  }
  const company =
    (await prisma.corporateCompany.findFirst({
      where: { name: "Phase 5 Demo Co" },
      select: { id: true },
    })) ??
    (await prisma.corporateCompany.create({
      data: {
        name: "Phase 5 Demo Co",
        countryCode: country.code,
        billingEmail: "p5-billing@test.local",
        contactName: "Phase Five",
        contactEmail: "p5-contact@test.local",
        planId: corporatePlan.id,
        status: "ACTIVE",
      },
    }));

  const corpUser = await prisma.user.upsert({
    where: { email: CORPORATE_EMAIL },
    update: { passwordHash, emailVerifiedAt: new Date(), role: "PATIENT" },
    create: {
      email: CORPORATE_EMAIL,
      passwordHash,
      fullName: "Phase Five Corporate",
      role: "PATIENT",
      emailVerifiedAt: new Date(),
    },
  });
  const employee = await prisma.corporateEmployee.findFirst({
    where: { companyId: company.id, email: CORPORATE_EMAIL },
    select: { id: true },
  });
  if (employee) {
    await prisma.corporateEmployee.update({
      where: { id: employee.id },
      data: { status: "ACTIVE", userId: corpUser.id },
    });
  } else {
    await prisma.corporateEmployee.create({
      data: {
        companyId: company.id,
        userId: corpUser.id,
        email: CORPORATE_EMAIL,
        firstName: "Phase Five",
        lastName: "Corporate",
        status: "ACTIVE",
      },
    });
  }
  log("corporate", { companyId: company.id, userId: corpUser.id });

  console.log(`\nLog in as ${MEMBER_EMAIL} / ${CORPORATE_EMAIL} with the seeded password.`);
  await prisma.$disconnect();
}

void main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exitCode = 1;
});

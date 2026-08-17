/**
 * Seed: Corporate Standard plan (private B2B).
 *
 *   pnpm --filter backend exec node --import tsx scripts/seed-corporate-plan.ts
 *
 * Idempotent (upserts by slug). Creates:
 *   1. CorporatePlan "corporate-standard" — €180/employee/year, EUR, max 5
 *      beneficiaries per employee.
 *   2. CorporateBenefitRule — 10% off GENERAL (GP) consultations, beneficiaries
 *      included. Configurable later from the admin corporate pages.
 *
 * It deliberately seeds NO consultations. A corporate consultation
 * (CorporatePlanService) names one assigned doctor, and which doctor delivers
 * it in which market is an admin decision this script cannot make. Add them on
 * /admin/corporate → Corporate consultations, which is also where the
 * pre-assessment / illness-benefit / fit-for-work roles are set.
 *
 * Refuses to run when NODE_ENV=production unless ALLOW_PROD_SEED=1.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

async function main() {
  const plan = await prisma.corporatePlan.upsert({
    where: { slug: "corporate-standard" },
    create: {
      slug: "corporate-standard",
      name: "Corporate Standard",
      annualPricePerEmployeeCents: 18000,
      currencyCode: "EUR",
      maxBeneficiariesPerEmployee: 5,
      isActive: true,
    },
    update: {}, // never overwrite admin-tuned price/limits on re-run
  });
  console.log(`plan ok: ${plan.slug} (${plan.id})`);

  const existingRule = await prisma.corporateBenefitRule.findFirst({
    where: { corporatePlanId: plan.id, serviceKind: "GENERAL", serviceId: null },
  });
  if (!existingRule) {
    await prisma.corporateBenefitRule.create({
      data: {
        corporatePlanId: plan.id,
        serviceKind: "GENERAL",
        discountPercent: 10,
        appliesToBeneficiaries: true,
        isActive: true,
      },
    });
    console.log("rule created: GENERAL 10% (beneficiaries included)");
  } else {
    console.log(`rule exists: GENERAL ${existingRule.discountPercent}% — left untouched`);
  }

  const consultations = await prisma.corporatePlanService.count({
    where: { corporatePlanId: plan.id },
  });
  if (consultations === 0) {
    console.log(
      "\nNext: add the plan's consultations on /admin/corporate (name, assigned doctor,\n" +
        "duration, role). Until at least a PRE_ASSESSMENT one exists, employees cannot\n" +
        "complete onboarding.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

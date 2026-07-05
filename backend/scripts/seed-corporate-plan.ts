/**
 * Seed: Corporate Standard plan (private B2B) + corporate-only services.
 *
 *   pnpm --filter backend exec node --import tsx scripts/seed-corporate-plan.ts [--country=ie]
 *
 * Idempotent (upserts by slug). Creates:
 *   1. CorporatePlan "corporate-standard" — €180/employee/year, EUR, max 5
 *      beneficiaries per employee.
 *   2. CorporateBenefitRule — 10% off GENERAL (GP) consultations, beneficiaries
 *      included. Configurable later from the admin corporate pages.
 *   3. Per active country (or just --country=xx): three hidden services —
 *        corporate-pre-assessment      (CORPORATE_ONLY)
 *        corporate-illness-benefit     (CORPORATE_REQUEST_ONLY)
 *        corporate-fit-for-work        (CORPORATE_REQUEST_ONLY)
 *      All €0 (included in the plan), GENERAL kind, isActive=true. They never
 *      appear on public surfaces (ServiceVisibility gate).
 *
 * AFTER SEEDING an admin still has to:
 *   - assign doctors to the corporate services (ServiceDoctor), otherwise
 *     no slots are bookable;
 *   - set each company's preAssessmentDoctorId ("selected Doctor/Admin").
 *
 * Refuses to run when NODE_ENV=production unless ALLOW_PROD_SEED=1.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

const countryArg = process.argv.find((a) => a.startsWith("--country="))?.split("=")[1];

const CORPORATE_SERVICES = [
  {
    slug: "corporate-pre-assessment",
    name: "Pre-assessment Consultation",
    summary:
      "Initial corporate onboarding consultation with your company's assigned Global Health doctor.",
    visibility: "CORPORATE_ONLY" as const,
  },
  {
    slug: "corporate-illness-benefit",
    name: "Illness Benefit Consultation",
    summary:
      "Company-requested consultation to assess illness benefit eligibility for an employee.",
    visibility: "CORPORATE_REQUEST_ONLY" as const,
  },
  {
    slug: "corporate-fit-for-work",
    name: "Fit-for-Work Consultation",
    summary:
      "Company-requested consultation to assess an employee's fitness to return to work.",
    visibility: "CORPORATE_REQUEST_ONLY" as const,
  },
];

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
    console.log(
      `rule exists: GENERAL ${existingRule.discountPercent}% — left untouched`,
    );
  }

  const countries = await prisma.country.findMany({
    where: { isActive: true, ...(countryArg ? { code: countryArg.toLowerCase() } : {}) },
    select: { id: true, code: true, name: true },
  });
  if (countries.length === 0) {
    console.error(countryArg ? `country ${countryArg} not found/active` : "no active countries");
    process.exit(1);
  }

  for (const country of countries) {
    for (const svc of CORPORATE_SERVICES) {
      await prisma.service.upsert({
        where: { countryId_slug: { countryId: country.id, slug: svc.slug } },
        create: {
          countryId: country.id,
          kind: "GENERAL",
          slug: svc.slug,
          name: svc.name,
          summary: svc.summary,
          basePriceCents: 0,
          isActive: true,
          visibility: svc.visibility,
          sortOrder: 999,
        },
        update: { visibility: svc.visibility }, // heal visibility drift only
      });
    }
    console.log(`services ok: ${country.code} (${country.name})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

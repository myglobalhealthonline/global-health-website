/**
 * Seed: the 7 corporate B2B plans (Basic … Premium ++).
 *
 *   pnpm --filter backend exec node --import tsx scripts/seed-corporate-plan.ts
 *
 * Idempotent. Plans upsert by slug; price / name / beneficiary limits are NEVER
 * overwritten on re-run (an admin may have tuned them). The display fields
 * added with the coverage-rule work — tier, sortOrder, priceNote — ARE refreshed,
 * because they are what orders the comparison matrix and no admin has tuned them
 * yet.
 *
 * `corporate-standard` keeps its slug: it is the plan already live in
 * production (€180 = the Standard column), and companies point at it.
 *
 * WHAT IS SEEDED
 *   - the 7 plans, priced per employee per year in EUR;
 *   - the Employee Benefit Program row — 15% off GP consultations, families
 *     included — on every plan;
 *   - the €20 co-pay on general online consultations for the three Premium
 *     plans.
 *
 * WHAT IS NOT, AND WHY
 *   - Pre-assessment / occupational / fit-for-work / illness-injury rows are
 *     CorporatePlanService consultations. Each names ONE delivering doctor per
 *     market, which is an admin decision this script cannot make. Add them on
 *     /admin/corporate → Corporate consultations.
 *   - Physiotherapy / Chiropractic (€40 co-pay, 5 per contract year on Premium ++)
 *     must be pinned to specific Service rows — a kind-wide SPECIALIST rule
 *     would co-pay cardiology too. Chiropractic has no Service row in any market
 *     yet; physiotherapy exists as `physiotherapy-specialist-consultation`.
 *   - Legal health tests: the price is still pending (season delays), and the
 *     benefit engine deliberately covers GENERAL/SPECIALIST consultations only.
 *   - Operational activities, health data management, corporate reporting and
 *     follow-up are service commitments, not bookable products. They live in the
 *     sales matrix, not in the pricing engine.
 *
 * Refuses to run when NODE_ENV=production unless ALLOW_PROD_SEED=1.
 */
import "dotenv/config";
import { prisma } from "../src/db/prisma.js";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "1") {
  console.error("Refusing to seed on production without ALLOW_PROD_SEED=1");
  process.exit(1);
}

/** Annual price per employee, in EUR cents, straight off the plan matrix. */
const PLANS = [
  { slug: "corporate-basic", name: "Corporate Basic", tier: "Basic", cents: 9900, generalCopayCents: null },
  { slug: "corporate-basic-plus", name: "Corporate Basic +", tier: "Basic", cents: 35000, generalCopayCents: null },
  { slug: "corporate-standard", name: "Corporate Standard", tier: "Standard", cents: 18000, generalCopayCents: null },
  { slug: "corporate-standard-plus", name: "Corporate Standard +", tier: "Standard", cents: 43000, generalCopayCents: null },
  { slug: "corporate-premium", name: "Corporate Premium", tier: "Premium", cents: 22000, generalCopayCents: 2000 },
  { slug: "corporate-premium-plus", name: "Corporate Premium +", tier: "Premium", cents: 55000, generalCopayCents: 2000 },
  { slug: "corporate-premium-plus-plus", name: "Corporate Premium ++", tier: "Premium", cents: 65000, generalCopayCents: 2000 },
] as const;

/** Plans whose price is not final. Printed next to the price everywhere. */
const PRICE_PENDING_NOTE =
  "Price pending — the plans including legal health tests are subject to season delays.";
const PRICE_PENDING_SLUGS = new Set([
  "corporate-basic-plus",
  "corporate-standard-plus",
  "corporate-premium-plus",
  "corporate-premium-plus-plus",
]);

async function main() {
  for (const [index, spec] of PLANS.entries()) {
    const plan = await prisma.corporatePlan.upsert({
      where: { slug: spec.slug },
      create: {
        slug: spec.slug,
        name: spec.name,
        annualPricePerEmployeeCents: spec.cents,
        currencyCode: "EUR",
        maxBeneficiariesPerEmployee: 5,
        isActive: true,
        tier: spec.tier,
        sortOrder: index,
        priceNote: PRICE_PENDING_SLUGS.has(spec.slug) ? PRICE_PENDING_NOTE : null,
      },
      // Display fields only — never the commercial ones.
      update: {
        tier: spec.tier,
        sortOrder: index,
        priceNote: PRICE_PENDING_SLUGS.has(spec.slug) ? PRICE_PENDING_NOTE : null,
      },
    });
    console.log(`plan ok: ${plan.slug} (€${(plan.annualPricePerEmployeeCents / 100).toFixed(2)})`);

    // Employee Benefit Program — every plan, families included.
    const ebp = await prisma.corporateBenefitRule.findFirst({
      where: {
        corporatePlanId: plan.id,
        serviceKind: "GENERAL",
        serviceId: null,
        coverage: "DISCOUNT",
      },
    });
    if (!ebp) {
      await prisma.corporateBenefitRule.create({
        data: {
          corporatePlanId: plan.id,
          serviceKind: "GENERAL",
          coverage: "DISCOUNT",
          discountPercent: 15,
          appliesToBeneficiaries: true,
          isActive: true,
        },
      });
      console.log("  rule created: GENERAL −15% (Employee Benefit Program, families included)");
    } else {
      console.log(`  rule exists: GENERAL −${ebp.discountPercent}% — left untouched`);
    }

    if (spec.generalCopayCents == null) continue;
    // Premium tier: general online consultations at a fixed co-pay. Sits on the
    // same kind as the 15% row above — the engine picks whichever leaves the
    // member paying less, so a service cheaper than the co-pay still gets 15%.
    const copay = await prisma.corporateBenefitRule.findFirst({
      where: {
        corporatePlanId: plan.id,
        serviceKind: "GENERAL",
        serviceId: null,
        coverage: "COPAY",
      },
    });
    if (!copay) {
      await prisma.corporateBenefitRule.create({
        data: {
          corporatePlanId: plan.id,
          serviceKind: "GENERAL",
          coverage: "COPAY",
          discountPercent: 0,
          copayCents: spec.generalCopayCents,
          appliesToBeneficiaries: true,
          isActive: true,
        },
      });
      console.log(`  rule created: GENERAL co-pay €${(spec.generalCopayCents / 100).toFixed(2)}`);
    } else {
      console.log(`  rule exists: GENERAL co-pay €${((copay.copayCents ?? 0) / 100).toFixed(2)} — left untouched`);
    }
  }

  console.log(
    "\nNext, on /admin/corporate:\n" +
      "  1. Add each plan's consultations (name, assigned doctor, duration, role).\n" +
      "     Until a PRE_ASSESSMENT one exists, employees cannot finish onboarding.\n" +
      "  2. Premium ++: add the physiotherapy / chiropractic co-pay as rules pinned\n" +
      "     to those Service rows — €40, limit 5, same limit group on both so the 5\n" +
      "     is shared. Chiropractic needs a Service row created first.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

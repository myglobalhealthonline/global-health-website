import { join } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: join(__dirname, "..", ".env") });

/**
 * Seed the pilot country's 3 subscription plans (§31). Idempotent — re-running
 * upserts by (countryId, slug). Values are admin-editable placeholders (D14).
 * Runs Stripe Price sync after upsert so each plan gets a stripePriceId.
 *
 *   node --import tsx scripts/seed-subscription-plans.ts [COUNTRY_CODE]
 *
 * Country defaults to $SEED_SUBSCRIPTION_COUNTRY or "IE".
 */

interface PlanSeed {
  slug: string;
  name: string;
  shortDescription: string;
  monthlyPriceCents: number;
  monthlyConsultationCredits: number;
  wellnessCreditsPerMonth: number;
  isFeatured: boolean;
  displayOrder: number;
}

const PLAN_SEEDS: PlanSeed[] = [
  {
    slug: "essential-care",
    name: "Essential Care Plan",
    shortDescription: "Affordable monthly access to online GP care.",
    monthlyPriceCents: 2000,
    monthlyConsultationCredits: 1,
    wellnessCreditsPerMonth: 0,
    isFeatured: false,
    displayOrder: 1,
  },
  {
    slug: "comprehensive-care",
    name: "Comprehensive Care Plan",
    shortDescription: "More monthly GP access for regular healthcare needs.",
    monthlyPriceCents: 3900,
    monthlyConsultationCredits: 2,
    wellnessCreditsPerMonth: 0,
    isFeatured: true,
    displayOrder: 2,
  },
  {
    slug: "premium-wellness-care",
    name: "Premium Wellness Care Plan",
    shortDescription: "Online care with added wellness rewards.",
    monthlyPriceCents: 4900,
    monthlyConsultationCredits: 3,
    wellnessCreditsPerMonth: 1,
    isFeatured: false,
    displayOrder: 3,
  },
];

async function main(): Promise<void> {
  const { prisma } = await import("../src/db/prisma.js");
  const { syncPlanStripePrice } = await import(
    "../src/modules/billing/price-sync.service.js"
  );

  const code = process.argv[2] ?? process.env.SEED_SUBSCRIPTION_COUNTRY ?? "ie";
  // Country codes are stored as-entered (lowercase in this repo) — match
  // case-insensitively so "IE" / "ie" both resolve.
  const country = await prisma.country.findFirst({
    where: { code: { equals: code, mode: "insensitive" } },
    include: { currency: { select: { code: true } } },
  });
  if (!country) {
    console.error(`[seed] country ${code} not found — nothing seeded`);
    return;
  }
  if (!country.enabledFeatures.includes("subscriptions")) {
    await prisma.country.update({
      where: { id: country.id },
      data: { enabledFeatures: [...country.enabledFeatures, "subscriptions"] },
    });
    console.log(`[seed] enabled subscriptions feature for ${code}`);
  }
  const currencyCode = country.currency.code;
  console.log(`[seed] seeding ${PLAN_SEEDS.length} plans for ${code} (${currencyCode})`);

  for (const seed of PLAN_SEEDS) {
    const plan = await prisma.pricingPlan.upsert({
      where: { countryId_slug: { countryId: country.id, slug: seed.slug } },
      create: {
        countryId: country.id,
        slug: seed.slug,
        name: seed.name,
        shortDescription: seed.shortDescription,
        monthlyPriceCents: seed.monthlyPriceCents,
        currencyCode,
        monthlyConsultationCredits: seed.monthlyConsultationCredits,
        wellnessCreditsPerMonth: seed.wellnessCreditsPerMonth,
        familyEnabled: false,
        isFeatured: seed.isFeatured,
        displayOrder: seed.displayOrder,
        isActive: true,
      },
      update: {
        name: seed.name,
        shortDescription: seed.shortDescription,
        monthlyPriceCents: seed.monthlyPriceCents,
        currencyCode,
        monthlyConsultationCredits: seed.monthlyConsultationCredits,
        wellnessCreditsPerMonth: seed.wellnessCreditsPerMonth,
        isFeatured: seed.isFeatured,
        displayOrder: seed.displayOrder,
      },
    });

    // Perk rules: specialist discount unlocks after 2 paid months; Premium adds
    // wellness/test-kit redemption (also after 2 months). GP credits are MONTH_1.
    await upsertPerk(prisma, plan.id, "SPECIALIST_DISCOUNT", 2);
    if (seed.wellnessCreditsPerMonth > 0) {
      await upsertPerk(prisma, plan.id, "WELLNESS_REDEMPTION", 2);
      await upsertPerk(prisma, plan.id, "TEST_KIT_REDEMPTION", 2);
    }

    // Stripe Price sync (fake billing in dev) — gives the plan a stripePriceId.
    try {
      const { stripePriceId } = await syncPlanStripePrice(plan.id);
      console.log(`[seed]   ${seed.slug} → ${stripePriceId}`);
    } catch (err) {
      console.error(`[seed]   ${seed.slug} price sync FAILED:`, (err as Error).message);
    }
  }

  console.log("[seed] done");
}

async function upsertPerk(
  prisma: Awaited<typeof import("../src/db/prisma.js")>["prisma"],
  planId: string,
  perkKey: "SPECIALIST_DISCOUNT" | "WELLNESS_REDEMPTION" | "TEST_KIT_REDEMPTION",
  unlockAfterPaidMonths: number,
): Promise<void> {
  await prisma.planPerkRule.upsert({
    where: { planId_perkKey: { planId, perkKey } },
    create: { planId, perkKey, unlockMode: "AFTER_PAID_MONTHS", unlockAfterPaidMonths },
    update: { unlockMode: "AFTER_PAID_MONTHS", unlockAfterPaidMonths },
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

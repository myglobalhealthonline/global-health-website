import type { PrismaClient } from "@prisma/client";

/**
 * Shared DB fixtures for subscription/credit integration tests. NOT a *.test.ts
 * file, so the runner ignores it — imported by the real test files.
 *
 * Every fixture is tagged with a caller-supplied unique token so parallel test
 * files never collide, and `cleanup()` removes everything in FK-safe order.
 */

export interface SubscriptionFixture {
  currencyId: string;
  countryId: string;
  countryCode: string;
  userId: string;
  planId: string;
  subscriptionId: string;
  cleanup: () => Promise<void>;
}

export interface MakeFixtureOptions {
  consultationBalance?: number;
  wellnessBalance?: number;
  monthlyConsultationCredits?: number;
  wellnessCreditsPerMonth?: number;
  status?: "INCOMPLETE" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "PAUSED";
  paidMonthsCount?: number;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  planSnapshot?: unknown;
}

let counter = 0;

export async function makeSubscriptionFixture(
  prisma: PrismaClient,
  tag: string,
  opts: MakeFixtureOptions = {},
): Promise<SubscriptionFixture> {
  counter += 1;
  const uniq = `${tag}-${counter}`;
  const code = `T${uniq}`.slice(0, 8).toUpperCase();

  const currency = await prisma.currency.create({
    data: { code: `C${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
  });
  const country = await prisma.country.create({
    data: {
      code,
      name: `Sub Test ${uniq}`,
      slug: `sub-test-${uniq}`,
      legacyHomePath: `/legacy-${uniq}`,
      teamPath: `/team-${uniq}`,
      generalConsultationPath: `/gen-${uniq}`,
      specialistConsultationPath: `/spec-${uniq}`,
      currencyId: currency.id,
    },
  });
  const user = await prisma.user.create({
    data: {
      email: `sub-${uniq}@test.local`,
      passwordHash: "x",
      fullName: `Sub User ${uniq}`,
      role: "PATIENT",
    },
  });
  const plan = await prisma.pricingPlan.create({
    data: {
      countryId: country.id,
      slug: `plan-${uniq}`,
      name: `Plan ${uniq}`,
      monthlyPriceCents: 4900,
      currencyCode: currency.code,
      monthlyConsultationCredits: opts.monthlyConsultationCredits ?? 3,
      wellnessCreditsPerMonth: opts.wellnessCreditsPerMonth ?? 0,
    },
  });
  const sub = await prisma.userSubscription.create({
    data: {
      userId: user.id,
      planId: plan.id,
      countryCode: country.code,
      status: opts.status ?? "ACTIVE",
      paidMonthsCount: opts.paidMonthsCount ?? 1,
      currentPeriodStart: new Date("2026-06-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
      ...(opts.stripeSubscriptionId ? { stripeSubscriptionId: opts.stripeSubscriptionId } : {}),
      ...(opts.stripeCustomerId ? { stripeCustomerId: opts.stripeCustomerId } : {}),
      ...(opts.planSnapshot !== undefined
        ? { planSnapshot: opts.planSnapshot as object }
        : {}),
    },
  });

  if (opts.consultationBalance != null) {
    await prisma.subscriptionCreditBalance.create({
      data: { userSubscriptionId: sub.id, kind: "CONSULTATION", balance: opts.consultationBalance },
    });
  }
  if (opts.wellnessBalance != null) {
    await prisma.subscriptionCreditBalance.create({
      data: { userSubscriptionId: sub.id, kind: "WELLNESS", balance: opts.wellnessBalance },
    });
  }

  const cleanup = async (): Promise<void> => {
    await prisma.consultationCreditLedger.deleteMany({ where: { userSubscriptionId: sub.id } });
    await prisma.wellnessCreditLedger.deleteMany({ where: { userSubscriptionId: sub.id } });
    await prisma.subscriptionCreditBalance.deleteMany({ where: { userSubscriptionId: sub.id } });
    await prisma.healthTestRedemption.deleteMany({ where: { userSubscriptionId: sub.id } });
    await prisma.subscriptionInvoice.deleteMany({ where: { userSubscriptionId: sub.id } });
    await prisma.subscriptionPerkGrant.deleteMany({ where: { userSubscriptionId: sub.id } });
    await prisma.userSubscription.deleteMany({ where: { id: sub.id } });
    await prisma.pricingPlan.deleteMany({ where: { id: plan.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
    await prisma.country.deleteMany({ where: { id: country.id } });
    await prisma.currency.deleteMany({ where: { id: currency.id } });
  };

  return {
    currencyId: currency.id,
    countryId: country.id,
    countryCode: country.code,
    userId: user.id,
    planId: plan.id,
    subscriptionId: sub.id,
    cleanup,
  };
}

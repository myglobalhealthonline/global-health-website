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
  /** Ids of any FamilyMember rows created via `opts.familyMembers`. */
  familyMemberIds: string[];
  cleanup: () => Promise<void>;
}

export interface MakeFixtureOptions {
  consultationBalance?: number;
  wellnessBalance?: number;
  monthlyConsultationCredits?: number;
  wellnessCreditsPerMonth?: number;
  /**
   * Paid months before benefits unlock (D25). Defaults to 0 (immediate) so
   * existing tests keep asserting month-1 grants; set to 2 to exercise the
   * month-2 unlock rule. The real DB column defaults to 2 — the fixture is
   * explicit to keep legacy tests isolated from the new default.
   */
  benefitsUnlockAfterPaidMonths?: number;
  status?: "INCOMPLETE" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "PAUSED";
  paidMonthsCount?: number;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  planSnapshot?: unknown;
  /** Plan tier (drives the Premium-only family/wellness guards). */
  planType?: "ESSENTIAL" | "COMPREHENSIVE" | "PREMIUM";
  /** Plan-level family-usage flag (Premium-only by guard). */
  familyEnabled?: boolean;
  /** Approved/unapproved dependents to create for the primary user. */
  familyMembers?: Array<{ canUseCredits: boolean; fullName?: string; email?: string }>;
  /** Add "subscriptions" to the country's enabledFeatures (strict opt-in gate). */
  enableSubscriptions?: boolean;
}

/** The repo's default feature set + optional "subscriptions" opt-in. */
function featuresFor(enableSubscriptions: boolean | undefined): string[] {
  const base = [
    "country-home",
    "country-content",
    "pages",
    "footer",
    "services",
    "general-consultations",
    "specialist-consultations",
    "online-prescriptions",
    "health-tests",
    "appointments",
  ];
  return enableSubscriptions ? [...base, "subscriptions"] : base;
}

let counter = 0;

export async function makeSubscriptionFixture(
  prisma: PrismaClient,
  tag: string,
  opts: MakeFixtureOptions = {},
): Promise<SubscriptionFixture> {
  counter += 1;
  // The old `T${tag}-${counter}`.slice(0, 8) truncated the counter away for
  // any tag of 7+ chars, so every fixture in a file got the same Country.code
  // and the second create hit the unique constraint. Build codes from the
  // pid + counter instead (tag can't fit uniquely in 8 chars); pid keeps
  // codes unique across runs when a failed run leaves rows behind.
  const pfx = `${process.pid % 10000}-${counter}`;
  // `uniq` feeds Country.slug and the four unique *Path columns, so it needs
  // the same pid scoping as `code` — without it, rows left behind by a failed
  // run collide on slug forever and every subscription suite fails on a dirty
  // test database.
  const uniq = `${tag}-${pfx}`;
  const code = `T${pfx}`.slice(0, 8).toUpperCase();

  const currency = await prisma.currency.create({
    data: { code: `C${pfx}`.slice(0, 9), symbol: "€", decimals: 2 },
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
      enabledFeatures: featuresFor(opts.enableSubscriptions),
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
      planType: opts.planType ?? "COMPREHENSIVE",
      familyEnabled: opts.familyEnabled ?? false,
      monthlyPriceCents: 4900,
      currencyCode: currency.code,
      monthlyConsultationCredits: opts.monthlyConsultationCredits ?? 3,
      wellnessCreditsPerMonth: opts.wellnessCreditsPerMonth ?? 0,
      benefitsUnlockAfterPaidMonths: opts.benefitsUnlockAfterPaidMonths ?? 0,
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

  const familyMemberIds: string[] = [];
  if (opts.familyMembers?.length) {
    for (const [idx, fm] of opts.familyMembers.entries()) {
      const created = await prisma.familyMember.create({
        data: {
          primaryUserId: user.id,
          fullName: fm.fullName ?? `Dependent ${idx + 1} ${uniq}`,
          email: fm.email ?? null,
          canUseCredits: fm.canUseCredits,
        },
      });
      familyMemberIds.push(created.id);
    }
  }

  const cleanup = async (): Promise<void> => {
    // User/country-scoped so tests that create extra subscriptions, plans,
    // redemptions, or orders during the run are fully torn down.
    const subs = await prisma.userSubscription.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const subIds = subs.map((s) => s.id);
    await prisma.consultationCreditLedger.deleteMany({ where: { userId: user.id } });
    await prisma.wellnessCreditLedger.deleteMany({ where: { userId: user.id } });
    await prisma.subscriptionCreditBalance.deleteMany({
      where: { userSubscriptionId: { in: subIds } },
    });
    await prisma.subscriptionInvoice.deleteMany({ where: { userSubscriptionId: { in: subIds } } });
    await prisma.subscriptionPerkGrant.deleteMany({ where: { userSubscriptionId: { in: subIds } } });
    await prisma.healthTestRedemption.deleteMany({ where: { userId: user.id } });
    await prisma.order.deleteMany({ where: { userId: user.id } });
    await prisma.familyMember.deleteMany({ where: { primaryUserId: user.id } });
    await prisma.userSubscription.deleteMany({ where: { userId: user.id } });
    await prisma.healthTest.deleteMany({ where: { countryId: country.id } });
    await prisma.planStripePrice.deleteMany({ where: { plan: { countryId: country.id } } });
    await prisma.pricingPlan.deleteMany({ where: { countryId: country.id } });
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
    familyMemberIds,
    cleanup,
  };
}

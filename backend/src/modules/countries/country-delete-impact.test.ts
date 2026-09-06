import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { uniqueCurrencyCode } from "../../test-utils/unique-currency-code.js";

/**
 * AZ-3 — `purgeAdminCountry()` used to be a bare `country.delete()`.
 *
 * The Country row is the root of an 80-table `ON DELETE CASCADE` closure. The
 * chain the audit named is real and measured against this schema:
 *
 *   Country
 *     → MembershipPlan.primaryCountryId          (CASCADE)
 *       → MembershipEnrollment (planId,countryId) (CASCADE)
 *         → MembershipAllowanceBalance.holderEnrollmentId (CASCADE)
 *         → MembershipUsageLedger.enrollmentId          (CASCADE)
 *         → MembershipClaimToken / MembershipInviteLog  (CASCADE)
 *
 * and it is not the only one: `Doctor.countryId` cascades a doctor's bank
 * account, credentials and signed confidentiality agreement, `Service.countryId`
 * cascades the `MembershipBenefit` rows that allowance balances hang off, and
 * `Appointment.doctorId` / `.serviceId` / `.clinicId` / `.timeSlotId` are all
 * SET NULL, so a market's appointment history survives the purge gutted rather
 * than intact.
 *
 * These tests are written in their GREEN form: a country that carries durable
 * membership, financial, appointment or clinical history must REFUSE to purge,
 * and every row must still be there afterwards. Against the pre-fix service
 * they fail — that is the RED evidence.
 *
 * Synthetic fixtures only (`*.test` addresses, generated country codes), no
 * PHI, and the isolated local test cluster the test guard insists on.
 */
describe("country delete impact (AZ-3)", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./countries.service.js");
  let bootError: unknown = null;

  const uniq = `az3-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  let currencyId = "";

  /** Every country id this file created, for cleanup. */
  const createdCountryIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdOrderIds: string[] = [];

  // One country per scenario — a blocker in one must never mask another.
  let emptyCountry = { id: "", code: "" };
  let configCountry = { id: "", code: "" };
  let membershipCountry = { id: "", code: "" };
  let allowanceCountry = { id: "", code: "" };
  let subscriptionCountry = { id: "", code: "" };
  let clinicalCountry = { id: "", code: "" };
  let multiCountry = { id: "", code: "" };
  let purgeMeCountry = { id: "", code: "" };
  let raceCountry = { id: "", code: "" };

  let counter = 0;
  const mkCountry = async (label: string) => {
    const n = counter++;
    const code = `z${n}${Date.now().toString(36)}`.slice(0, 8).toLowerCase();
    const row = await prisma.country.create({
      data: {
        code,
        name: `AZ3 ${label} ${uniq}`,
        slug: `az3-${label}-${uniq}`.toLowerCase(),
        legacyHomePath: `/az3-lg-${label}-${uniq}`,
        teamPath: `/az3-tm-${label}-${uniq}`,
        generalConsultationPath: `/az3-gn-${label}-${uniq}`,
        specialistConsultationPath: `/az3-sp-${label}-${uniq}`,
        currencyId,
      },
    });
    createdCountryIds.push(row.id);
    return { id: row.id, code: row.code };
  };

  /** Locales + a domain + a booking setting: pure country configuration. */
  const addConfiguration = async (countryId: string, domainSuffix: string) => {
    await prisma.countryLocale.createMany({
      data: [
        { countryId, locale: "EN", isDefault: true },
        { countryId, locale: "CS", isDefault: false },
      ],
    });
    await prisma.countryDomain.create({
      data: { countryId, domain: `az3-${domainSuffix}-${uniq}.test`, isPrimary: true },
    });
    await prisma.bookingSetting.create({ data: { countryId } });
  };

  const mkService = (countryId: string, slug: string) =>
    prisma.service.create({
      data: { countryId, slug: `${slug}-${uniq}`, name: `Service ${slug}`, kind: "GENERAL" },
    });

  const mkPlanWithLevel = async (countryId: string, slug: string) => {
    const plan = await prisma.membershipPlan.create({
      data: { primaryCountryId: countryId, slug: `${slug}-${uniq}`, name: `Plan ${slug}` },
    });
    const level = await prisma.membershipLevel.create({
      data: { planId: plan.id, slug: `lvl-${slug}-${uniq}`, name: "Standard", isDefault: true },
    });
    return { plan, level };
  };

  const mkEnrollment = (
    planId: string,
    levelId: string,
    countryId: string,
    seq: number,
  ) =>
    prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId,
        countryId,
        membershipId: `AZ3-${uniq}-${seq}`,
        email: `member-${seq}-${uniq}@example.test`,
        firstName: "Test",
        lastName: "Member",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
      },
    });

  const mkDoctor = (countryId: string, slug: string) =>
    prisma.doctor.create({
      data: { countryId, slug: `${slug}-${uniq}`, fullName: `Dr ${slug}`, title: "GP" },
    });

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./countries.service.js");
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }

    currencyId = (
      await prisma.currency.create({
        data: { code: uniqueCurrencyCode(), symbol: "€", decimals: 2 },
      })
    ).id;

    emptyCountry = await mkCountry("empty");

    configCountry = await mkCountry("config");
    await addConfiguration(configCountry.id, "config");

    // Membership enrollment history — the audit's original chain.
    membershipCountry = await mkCountry("member");
    {
      const { plan, level } = await mkPlanWithLevel(membershipCountry.id, "mplan");
      await mkEnrollment(plan.id, level.id, membershipCountry.id, 1);
    }

    // Allowance balance + usage ledger on top of an enrollment.
    allowanceCountry = await mkCountry("allow");
    {
      const { plan, level } = await mkPlanWithLevel(allowanceCountry.id, "aplan");
      await prisma.membershipPlanCountry.create({
        data: { planId: plan.id, countryId: allowanceCountry.id },
      });
      const service = await mkService(allowanceCountry.id, "a-gp");
      const enrollment = await mkEnrollment(plan.id, level.id, allowanceCountry.id, 2);
      const benefit = await prisma.membershipBenefit.create({
        data: {
          levelId: level.id,
          planId: plan.id,
          countryId: allowanceCountry.id,
          serviceId: service.id,
          benefitType: "ALLOWANCE",
          allowanceCount: 2,
        },
      });
      const balance = await prisma.membershipAllowanceBalance.create({
        data: {
          benefitId: benefit.id,
          holderEnrollmentId: enrollment.id,
          allocated: 2,
          used: 1,
          termStart: new Date("2026-01-01T00:00:00.000Z"),
        },
      });
      await prisma.membershipUsageLedger.create({
        data: {
          balanceId: balance.id,
          enrollmentId: enrollment.id,
          delta: -1,
          reason: "SPEND",
          idempotencyKey: `az3-ledger-${uniq}`,
        },
      });
    }

    // Subscription + order: financial history for the market.
    subscriptionCountry = await mkCountry("subs");
    {
      const plan = await prisma.pricingPlan.create({
        data: {
          countryId: subscriptionCountry.id,
          slug: `pp-${uniq}`,
          name: "Comprehensive",
          monthlyPriceCents: 4900,
          currencyCode: "EUR",
        },
      });
      const user = await prisma.user.create({
        data: {
          email: `subscriber-${uniq}@example.test`,
          passwordHash: "x",
          fullName: "Test Subscriber",
        },
      });
      createdUserIds.push(user.id);
      await prisma.userSubscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          countryCode: subscriptionCountry.code,
          status: "ACTIVE",
        },
      });
      const order = await prisma.order.create({
        data: {
          email: `buyer-${uniq}@example.test`,
          fullName: "Test Buyer",
          countryCode: subscriptionCountry.code,
          currencyCode: "EUR",
          subtotalCents: 4900,
          totalCents: 4900,
        },
      });
      createdOrderIds.push(order.id);
    }

    // Doctor + appointment + consultation: clinical history.
    clinicalCountry = await mkCountry("clin");
    {
      const doctor = await mkDoctor(clinicalCountry.id, "clin-doc");
      const appointment = await prisma.appointment.create({
        data: {
          countryCode: clinicalCountry.code,
          consultationType: "GENERAL",
          fullName: "Test Patient",
          email: `patient-${uniq}@example.test`,
          consentAccepted: true,
          doctorId: doctor.id,
        },
      });
      await prisma.consultation.create({
        data: { appointmentId: appointment.id, doctorId: doctor.id },
      });
    }

    // Several categories at once.
    multiCountry = await mkCountry("multi");
    {
      await addConfiguration(multiCountry.id, "multi");
      const { plan, level } = await mkPlanWithLevel(multiCountry.id, "xplan");
      await mkEnrollment(plan.id, level.id, multiCountry.id, 3);
      await mkDoctor(multiCountry.id, "multi-doc");
      await prisma.jobListing.create({
        data: {
          countryId: multiCountry.id,
          locale: "EN",
          slug: `job-${uniq}`,
          title: "GP",
          department: "Clinical",
          location: "Remote",
          workplaceMode: "REMOTE",
          employmentType: "Full time",
          descriptionHtml: "<p>Body</p>",
          status: "PUBLISHED",
        },
      });
    }

    // Configuration only — must actually purge.
    purgeMeCountry = await mkCountry("purge");
    await addConfiguration(purgeMeCountry.id, "purge");
    await mkService(purgeMeCountry.id, "p-gp");
    await prisma.specialty.create({
      data: { countryId: purgeMeCountry.id, slug: `spec-${uniq}`, name: "General" },
    });

    // Concurrency: a plan with no enrollment yet.
    raceCountry = await mkCountry("race");
    await mkPlanWithLevel(raceCountry.id, "rplan");
  });

  after(async () => {
    if (bootError) return;
    for (const id of createdOrderIds) {
      await prisma.order.deleteMany({ where: { id } }).catch(() => {});
    }
    for (const id of createdUserIds) {
      await prisma.userSubscription.deleteMany({ where: { userId: id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id } }).catch(() => {});
    }
    for (const id of createdCountryIds) {
      // Restrict-linked children first, else the cleanup delete itself refuses.
      await prisma.jobListing.deleteMany({ where: { countryId: id } }).catch(() => {});
      await prisma.consultation
        .deleteMany({ where: { doctor: { countryId: id } } })
        .catch(() => {});
      await prisma.appointment
        .deleteMany({ where: { OR: [{ doctor: { countryId: id } }, { service: { countryId: id } }] } })
        .catch(() => {});
      await prisma.country.deleteMany({ where: { id } }).catch(() => {});
    }
    if (currencyId) {
      await prisma.currency.deleteMany({ where: { id: currencyId } }).catch(() => {});
    }
  });

  const skip = () => (bootError ? { skip: "database unavailable" } : {});

  // ── impact: shape and safe cases ─────────────────────────────────────────

  it("returns null for a country that does not exist", skip(), async () => {
    if (bootError) return;
    assert.equal(await svc.getCountryDeleteImpact("country-that-does-not-exist"), null);
  });

  it("reports an empty country as unblocked, with every blocker zero", skip(), async () => {
    if (bootError) return;
    const impact = await svc.getCountryDeleteImpact(emptyCountry.id);
    assert.ok(impact);
    assert.equal(impact.blocked, false);
    for (const [key, value] of Object.entries(impact.blockers)) {
      assert.equal(value, 0, `blocker ${key} should be 0 on an empty country`);
    }
  });

  it("reports disposable configuration counts without blocking", skip(), async () => {
    if (bootError) return;
    const impact = await svc.getCountryDeleteImpact(configCountry.id);
    assert.ok(impact);
    assert.equal(impact.blocked, false);
    assert.equal(impact.removableConfiguration.locales, 2);
    assert.equal(impact.removableConfiguration.domains, 1);
    assert.equal(impact.removableConfiguration.marketSettings, 1);
  });

  // ── impact: blocking durable data ────────────────────────────────────────

  it("blocks on a membership plan that has enrollments", skip(), async () => {
    if (bootError) return;
    const impact = await svc.getCountryDeleteImpact(membershipCountry.id);
    assert.ok(impact);
    assert.equal(impact.blocked, true);
    assert.equal(impact.blockers.membershipEnrollments, 1);
    assert.equal(impact.removableConfiguration.membershipPlans, 1);
  });

  it("blocks on allowance balances and usage ledger entries", skip(), async () => {
    if (bootError) return;
    const impact = await svc.getCountryDeleteImpact(allowanceCountry.id);
    assert.ok(impact);
    assert.equal(impact.blocked, true);
    assert.equal(impact.blockers.allowanceBalances, 1);
    assert.equal(impact.blockers.allowanceUsage, 1);
  });

  it("blocks on subscriptions and financial history", skip(), async () => {
    if (bootError) return;
    const impact = await svc.getCountryDeleteImpact(subscriptionCountry.id);
    assert.ok(impact);
    assert.equal(impact.blocked, true);
    assert.equal(impact.blockers.subscriptions, 1);
    assert.equal(impact.blockers.financialRecords, 1);
  });

  it("blocks on doctors, appointments and clinical records", skip(), async () => {
    if (bootError) return;
    const impact = await svc.getCountryDeleteImpact(clinicalCountry.id);
    assert.ok(impact);
    assert.equal(impact.blocked, true);
    assert.equal(impact.blockers.doctors, 1);
    assert.equal(impact.blockers.appointments, 1);
    assert.equal(impact.blockers.clinicalRecords, 1);
  });

  it("reports several blocker categories at once, and no PHI", skip(), async () => {
    if (bootError) return;
    const impact = await svc.getCountryDeleteImpact(multiCountry.id);
    assert.ok(impact);
    assert.equal(impact.blocked, true);
    assert.equal(impact.blockers.membershipEnrollments, 1);
    assert.equal(impact.blockers.doctors, 1);
    assert.equal(impact.blockers.jobListings, 1);

    // Counts only: every leaf in the payload is a number or a boolean, and the
    // serialized payload carries none of the fixture identifiers.
    const leaves = [
      ...Object.values(impact.blockers),
      ...Object.values(impact.removableConfiguration),
      ...Object.values(impact.detachedRecords),
    ];
    for (const leaf of leaves) assert.equal(typeof leaf, "number");
    const json = JSON.stringify(impact);
    for (const needle of ["@example.test", uniq, "Member", "Dr ", "AZ3", multiCountry.code]) {
      assert.equal(json.includes(needle), false, `impact payload leaked "${needle}"`);
    }
  });

  // ── purge enforcement ────────────────────────────────────────────────────

  it("refuses to purge a country with membership enrollment history", skip(), async () => {
    if (bootError) return;
    await assert.rejects(
      () => svc.purgeAdminCountry(membershipCountry.id),
      (err: unknown) => err instanceof svc.CountryDeleteBlockedError,
    );
  });

  it("leaves the country and every durable child untouched after a refusal", skip(), async () => {
    if (bootError) return;
    await assert.rejects(() => svc.purgeAdminCountry(allowanceCountry.id));
    assert.ok(await prisma.country.findUnique({ where: { id: allowanceCountry.id } }));
    assert.equal(
      await prisma.membershipEnrollment.count({ where: { countryId: allowanceCountry.id } }),
      1,
    );
    assert.equal(
      await prisma.membershipAllowanceBalance.count({
        where: { holderEnrollment: { countryId: allowanceCountry.id } },
      }),
      1,
    );
    assert.equal(
      await prisma.membershipUsageLedger.count({
        where: { enrollment: { countryId: allowanceCountry.id } },
      }),
      1,
    );
    assert.equal(
      await prisma.membershipPlan.count({ where: { primaryCountryId: allowanceCountry.id } }),
      1,
    );
    assert.equal(await prisma.service.count({ where: { countryId: allowanceCountry.id } }), 1);
  });

  it("carries the recomputed impact on the blocked error", skip(), async () => {
    if (bootError) return;
    const error = await svc
      .purgeAdminCountry(clinicalCountry.id)
      .then(() => null)
      .catch((err: unknown) => err);
    assert.ok(error instanceof svc.CountryDeleteBlockedError);
    assert.equal(error.impact.blocked, true);
    assert.equal(error.impact.blockers.doctors, 1);
  });

  it("returns false, not a blocked error, for a country that does not exist", skip(), async () => {
    if (bootError) return;
    assert.equal(await svc.purgeAdminCountry("country-that-does-not-exist"), false);
  });

  it("purges a configuration-only country and cascades exactly that configuration", skip(), async () => {
    if (bootError) return;
    const before = await svc.getCountryDeleteImpact(purgeMeCountry.id);
    assert.ok(before);
    assert.equal(before.blocked, false);
    assert.equal(before.removableConfiguration.services, 1);
    assert.equal(before.removableConfiguration.specialties, 1);

    assert.equal(await svc.purgeAdminCountry(purgeMeCountry.id), true);

    assert.equal(await prisma.country.count({ where: { id: purgeMeCountry.id } }), 0);
    assert.equal(await prisma.countryLocale.count({ where: { countryId: purgeMeCountry.id } }), 0);
    assert.equal(await prisma.countryDomain.count({ where: { countryId: purgeMeCountry.id } }), 0);
    assert.equal(await prisma.bookingSetting.count({ where: { countryId: purgeMeCountry.id } }), 0);
    assert.equal(await prisma.service.count({ where: { countryId: purgeMeCountry.id } }), 0);
    assert.equal(await prisma.specialty.count({ where: { countryId: purgeMeCountry.id } }), 0);
    assert.equal(await svc.getCountryDeleteImpact(purgeMeCountry.id), null);
  });

  // ── concurrency ──────────────────────────────────────────────────────────

  /**
   * The race AZ-3 has to close: impact says zero, a membership enrollment is
   * created, and the purge cascades it away.
   *
   * A `FOR UPDATE` lock on the Country row alone does NOT close it —
   * `MembershipEnrollment` has no foreign key to Country, so its INSERT takes
   * `FOR KEY SHARE` on the MembershipPlan row, not on Country. The purge
   * therefore locks the country's plan rows too, which is what this proves: an
   * in-flight enrollment INSERT holds `FOR KEY SHARE` on the plan, the purge's
   * `FOR UPDATE` on the same row conflicts, and the purge cannot reach a
   * decision until that writer commits or rolls back. When it commits, the
   * recomputed count inside the purge transaction sees it and refuses.
   */
  it("cannot decide while a dependent write is in flight, and then refuses", skip(), async () => {
    if (bootError) return;
    const plan = await prisma.membershipPlan.findFirstOrThrow({
      where: { primaryCountryId: raceCountry.id },
      include: { levels: true },
    });

    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    // A second connection holding an uncommitted enrollment INSERT.
    const holder = prisma.$transaction(
      async (tx) => {
        await tx.membershipEnrollment.create({
          data: {
            planId: plan.id,
            levelId: plan.levels[0]!.id,
            countryId: raceCountry.id,
            membershipId: `AZ3-RACE-${uniq}`,
            email: `race-${uniq}@example.test`,
            firstName: "Race",
            lastName: "Member",
            startDate: new Date("2026-01-01T00:00:00.000Z"),
          },
        });
        await gate;
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

    await new Promise((r) => setTimeout(r, 250)); // let the INSERT reach Postgres

    const purge = svc.purgeAdminCountry(raceCountry.id);
    const settled = purge.then(
      () => "resolved" as const,
      () => "rejected" as const,
    );
    const outcome = await Promise.race([
      settled,
      new Promise<"pending">((r) => setTimeout(() => r("pending"), 750)),
    ]);
    assert.equal(outcome, "pending", "purge decided while a dependent write was in flight");

    release();
    await holder;

    await assert.rejects(purge, (err: unknown) => err instanceof svc.CountryDeleteBlockedError);
    assert.ok(await prisma.country.findUnique({ where: { id: raceCountry.id } }));
    assert.equal(
      await prisma.membershipEnrollment.count({ where: { countryId: raceCountry.id } }),
      1,
    );
  });
});

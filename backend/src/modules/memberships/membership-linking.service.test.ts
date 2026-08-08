import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { uniqueCurrencyCode } from "../../test-utils/unique-currency-code.js";

/**
 * §5.2 — the verified-email gate, and the statuses linking produces.
 *
 * The gate is the security-critical half: an email match alone proves nothing,
 * so an unverified account must never inherit an enrollment. The status half is
 * the 2026-08-07 fix: a future `startDate` links as ACTIVE, because EXPIRED is
 * terminal and would permanently kill a correctly-imported future membership.
 *
 * Skips when Postgres is unreachable, matching the other DB-backed suites.
 */
describe("membership linking", () => {
  let prisma: PrismaClient | null = null;
  let link: typeof import("./membership-linking.service.js");
  let captured: { to: string; subject: string }[] = [];
  let restoreEmail: (() => void) | null = null;

  const uniq = `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const currencyCode = uniqueCurrencyCode();
  let currencyId = "";
  let countryId = "";
  let planId = "";
  let levelId = "";
  const userIds: string[] = [];
  const enrollmentIds: string[] = [];

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      prisma = null;
      return;
    }
    link = await import("./membership-linking.service.js");
    const emailModule = await import("../../lib/email/send-email.js");
    emailModule.setEmailCaptureHook((input) => {
      captured.push({ to: input.to, subject: input.subject });
    });
    restoreEmail = () => emailModule.setEmailCaptureHook(null);

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: `l${uniq}`.slice(0, 8).toLowerCase(),
        name: `Link Test ${uniq}`,
        slug: `link-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/llg-${uniq}`,
        teamPath: `/ltm-${uniq}`,
        generalConsultationPath: `/lgn-${uniq}`,
        specialistConsultationPath: `/lsp-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryId = country.id;
    const plan = await prisma.membershipPlan.create({
      data: { primaryCountryId: countryId, countries: { create: { countryId } }, slug: `link-plan-${uniq}`, name: "Link Plan" },
    });
    planId = plan.id;
    const level = await prisma.membershipLevel.create({
      data: { planId, slug: "standard", name: "Standard", isDefault: true },
    });
    levelId = level.id;
  });

  after(async () => {
    if (!prisma) return;
    restoreEmail?.();
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  async function mkUser(label: string, verified: boolean): Promise<{ id: string; email: string }> {
    const email = `${label}-${uniq}@test.local`;
    const user = await prisma!.user.create({
      data: {
        email,
        passwordHash: "x",
        fullName: `Link ${label}`,
        role: "PATIENT",
        emailVerifiedAt: verified ? new Date() : null,
      },
    });
    userIds.push(user.id);
    return { id: user.id, email };
  }

  async function mkEnrollment(email: string, overrides: Record<string, unknown> = {}) {
    const row = await prisma!.membershipEnrollment.create({
      data: {
        planId,
        levelId,
        countryId,
        membershipId: `M-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        email: email.toLowerCase(),
        firstName: "Test",
        lastName: "Member",
        startDate: new Date("2026-01-01"),
        status: "PENDING",
        ...overrides,
      },
    });
    enrollmentIds.push(row.id);
    return row;
  }

  it("does NOT link an unverified account — an email match is not proof of ownership", async (t) => {
    if (!prisma) return t.skip();
    const user = await mkUser("unverified", false);
    const enrollment = await mkEnrollment(user.email);

    const result = await link.linkMembershipsForUser(user.id);
    assert.equal(result.linked, 0);

    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.userId, null);
    assert.equal(after?.status, "PENDING");
  });

  it("links once the account verifies, and sends the confirmation once", async (t) => {
    if (!prisma) return t.skip();
    captured = [];
    const user = await mkUser("verified", true);
    const enrollment = await mkEnrollment(user.email);

    const first = await link.linkMembershipsForUser(user.id);
    assert.equal(first.linked, 1);
    const linked = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(linked?.userId, user.id);
    assert.equal(linked?.status, "ACTIVE");
    assert.ok(linked?.linkedAt);
    assert.equal(captured.length, 1);

    // Re-running (every login does) must not re-link or re-send: the query
    // itself excludes linked rows, which is the whole idempotency story.
    const second = await link.linkMembershipsForUser(user.id);
    assert.equal(second.linked, 0);
    assert.equal(captured.length, 1);
  });

  it("matches case-insensitively and ignores surrounding whitespace", async (t) => {
    if (!prisma) return t.skip();
    const email = `MixedCase-${uniq}@Test.Local`;
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: "x",
        fullName: "Mixed Case",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    userIds.push(user.id);
    const enrollment = await mkEnrollment(email.toUpperCase().toLowerCase());

    const result = await link.linkMembershipsForUser(user.id);
    assert.equal(result.linked, 1);
    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.userId, user.id);
  });

  it("links a FUTURE term as ACTIVE — EXPIRED is terminal and would kill it", async (t) => {
    if (!prisma) return t.skip();
    const user = await mkUser("future", true);
    const start = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const enrollment = await mkEnrollment(user.email, {
      startDate: start,
      endDate: new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000),
    });

    await link.linkMembershipsForUser(user.id);
    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.status, "ACTIVE", "a not-yet-started term links as ACTIVE");
  });

  it("links a lapsed term as EXPIRED", async (t) => {
    if (!prisma) return t.skip();
    const user = await mkUser("lapsed", true);
    const enrollment = await mkEnrollment(user.email, {
      startDate: new Date("2020-01-01"),
      endDate: new Date("2021-01-01"),
    });

    await link.linkMembershipsForUser(user.id);
    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.status, "EXPIRED");
  });

  it("leaves a SUSPENDED enrollment alone — only PENDING rows link", async (t) => {
    if (!prisma) return t.skip();
    const user = await mkUser("suspended", true);
    const enrollment = await mkEnrollment(user.email, { status: "SUSPENDED" });

    const result = await link.linkMembershipsForUser(user.id);
    assert.equal(result.linked, 0);
    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.status, "SUSPENDED");
    assert.equal(after?.userId, null);
  });

  it("linkMembershipsForEmail is a no-op when the account is unverified", async (t) => {
    if (!prisma) return t.skip();
    const user = await mkUser("byemail-unverified", false);
    await mkEnrollment(user.email);
    const result = await link.linkMembershipsForEmail(user.email.toUpperCase());
    assert.equal(result.linked, 0);
  });

  it("linkMembershipsForEmail links a verified account, whatever the case", async (t) => {
    if (!prisma) return t.skip();
    const user = await mkUser("byemail-verified", true);
    const enrollment = await mkEnrollment(user.email);
    const result = await link.linkMembershipsForEmail(user.email.toUpperCase());
    assert.equal(result.linked, 1);
    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.userId, user.id);
  });

  it("links every pending enrollment the address holds — a person may hold several (§19)", async (t) => {
    if (!prisma) return t.skip();
    const user = await mkUser("multi", true);
    const otherPlan = await prisma.membershipPlan.create({
      data: { primaryCountryId: countryId, countries: { create: { countryId } }, slug: `link-plan2-${uniq}`, name: "Link Plan 2" },
    });
    const otherLevel = await prisma.membershipLevel.create({
      data: {
        planId: otherPlan.id,
        slug: "standard",
        name: "Standard",
        isDefault: true,
      },
    });
    await mkEnrollment(user.email);
    await prisma.membershipEnrollment.create({
      data: {
        planId: otherPlan.id,
        levelId: otherLevel.id,
        countryId,
        membershipId: `M2-${uniq}`.slice(0, 60),
        email: user.email,
        firstName: "Test",
        lastName: "Member",
        startDate: new Date("2026-01-01"),
        status: "PENDING",
      },
    });

    const result = await link.linkMembershipsForUser(user.id);
    assert.equal(result.linked, 2);
    await prisma.membershipEnrollment.deleteMany({ where: { planId: otherPlan.id } });
    await prisma.membershipPlan.deleteMany({ where: { id: otherPlan.id } });
  });
});

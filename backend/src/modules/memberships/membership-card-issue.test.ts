import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import type { SendEmailInput } from "../../lib/email/send-email.js";
import { uniqueCurrencyCode } from "../../test-utils/unique-currency-code.js";

/**
 * §25/§41/§43 — card issue and its dedupe.
 *
 * These go through the REAL renderer: `issueMembershipCard` builds an actual
 * PDF through the shared Chromium the document pipeline uses. Stubbing it would
 * leave the one thing most likely to break — a card that renders on a developer
 * machine and throws in a container — untested.
 *
 * The price is that `closeSharedBrowser()` in `after` is mandatory (§24.3):
 * without it the browser child process holds this worker open until the
 * runner's timeout, and a leak reads exactly like a new flake.
 */
describe("membership card issue (database)", () => {
  let prisma: PrismaClient | null = null;
  let issue: typeof import("./membership-card-issue.js");
  let enrollments: typeof import("./membership-enrollments.service.js");

  const uniq = `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const currencyCode = uniqueCurrencyCode();
  let countryId = "";
  let czCountryId = "";
  let planId = "";
  let levelId = "";
  let sharedLevelId = "";
  const sent: SendEmailInput[] = [];
  const userIds: string[] = [];

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      prisma = null;
      return;
    }
    issue = await import("./membership-card-issue.js");
    enrollments = await import("./membership-enrollments.service.js");
    const emailModule = await import("../../lib/email/send-email.js");
    emailModule.setEmailCaptureHook((input) => sent.push(input));

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    const mkCountry = async (prefix: string, code: string) =>
      prisma!.country.create({
        data: {
          code,
          name: `Card Test ${prefix} ${uniq}`,
          slug: `card-test-${prefix}-${uniq}`.toLowerCase(),
          legacyHomePath: `/clg-${prefix}-${uniq}`,
          teamPath: `/ctm-${prefix}-${uniq}`,
          generalConsultationPath: `/cgn-${prefix}-${uniq}`,
          specialistConsultationPath: `/csp-${prefix}-${uniq}`,
          currencyId: currency.id,
        },
      });
    countryId = (await mkCountry("a", `c${uniq}`.slice(0, 8).toLowerCase())).id;
    czCountryId = (await mkCountry("b", `d${uniq}`.slice(0, 8).toLowerCase())).id;

    const plan = await prisma.membershipPlan.create({
      data: {
        primaryCountryId: countryId,
        countries: { create: [{ countryId }, { countryId: czCountryId }] },
        slug: `card-plan-${uniq}`,
        name: "Card Plan",
      },
    });
    planId = plan.id;

    const level = await prisma.membershipLevel.create({
      data: {
        planId,
        slug: "standard",
        name: "Standard",
        isDefault: true,
        familyEnabled: true,
        maxDependents: 2,
      },
    });
    levelId = level.id;
    const shared = await prisma.membershipLevel.create({
      data: {
        planId,
        slug: "family-shared",
        name: "Family",
        familyEnabled: true,
        maxDependents: 2,
        allowancePool: "SHARED",
      },
    });
    sharedLevelId = shared.id;

    // One benefit per country, so the grouping has something to group.
    for (const [id, level] of [
      [countryId, levelId],
      [czCountryId, levelId],
      [countryId, sharedLevelId],
    ] as const) {
      await prisma.membershipBenefit.create({
        data: {
          levelId: level,
          planId,
          countryId: id,
          serviceKind: "GENERAL",
          benefitType: "ALLOWANCE",
          allowanceCount: 6,
        },
      });
    }
  });

  after(async () => {
    // MANDATORY (§24.3) — the shared Chromium otherwise keeps this worker alive
    // until the runner times out, which looks like a flake rather than a leak.
    await (await import("../generated-documents/html-document-renderer.js")).closeSharedBrowser();
    if (!prisma) return;
    (await import("../../lib/email/send-email.js")).setEmailCaptureHook(null);
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.country.deleteMany({ where: { id: { in: [countryId, czCountryId] } } });
    await prisma.currency.deleteMany({ where: { code: currencyCode } });
    await prisma.$disconnect();
  });

  async function makeEnrollment(overrides: Record<string, unknown> = {}) {
    const suffix = Math.random().toString(36).slice(2, 8);
    return prisma!.membershipEnrollment.create({
      data: {
        planId,
        levelId,
        countryId,
        membershipId: `GH-CARD-${suffix.toUpperCase()}`,
        email: `card-${suffix}@example.com`,
        firstName: "Alex",
        lastName: "Doyle",
        startDate: new Date("2026-01-01"),
        status: "PENDING",
        ...overrides,
      },
    });
  }

  it("issues once and stamps cardIssuedAt", async (t) => {
    if (!prisma) return t.skip();
    const enrollment = await makeEnrollment();
    sent.length = 0;

    const first = await issue.issueMembershipCard({ enrollmentId: enrollment.id });
    assert.equal(first.issued, true);
    assert.equal(sent.length, 1);

    const after = await prisma!.membershipEnrollment.findUnique({
      where: { id: enrollment.id },
      select: { cardIssuedAt: true },
    });
    assert.ok(after?.cardIssuedAt, "the send must stamp the dedupe column");
  });

  it("attaches the PDF card", async (t) => {
    if (!prisma) return t.skip();
    const enrollment = await makeEnrollment();
    sent.length = 0;
    await issue.issueMembershipCard({ enrollmentId: enrollment.id });

    const attachment = sent[0]?.attachments?.[0];
    assert.ok(attachment, "the welcome email must carry the card");
    assert.match(attachment.filename, /\.pdf$/);
    assert.equal(attachment.contentType, "application/pdf");
    // A real PDF, not an empty buffer or an error page.
    assert.equal(attachment.content.subarray(0, 5).toString("latin1"), "%PDF-");
    assert.ok(attachment.content.length > 1000, "a card that small did not render");
  });

  it("emails nobody the second time — the re-import case (§41)", async (t) => {
    if (!prisma) return t.skip();
    const enrollment = await makeEnrollment();
    await issue.issueMembershipCard({ enrollmentId: enrollment.id });
    const stamped = await prisma!.membershipEnrollment.findUnique({
      where: { id: enrollment.id },
      select: { cardIssuedAt: true },
    });

    sent.length = 0;
    const second = await issue.issueMembershipCard({ enrollmentId: enrollment.id });
    assert.equal(second.issued, false);
    assert.equal(second.issued === false && second.reason, "already-issued");
    assert.equal(sent.length, 0, "a re-import must not write to anyone twice");

    const unchanged = await prisma!.membershipEnrollment.findUnique({
      where: { id: enrollment.id },
      select: { cardIssuedAt: true },
    });
    assert.deepEqual(unchanged?.cardIssuedAt, stamped?.cardIssuedAt);
  });

  it("re-issues on force, keeping the original issue date", async (t) => {
    if (!prisma) return t.skip();
    // The §26 resend. `cardIssuedAt` answers "does this person have a card",
    // not "when was the last copy sent" — the audit row is the per-send trail.
    const enrollment = await makeEnrollment();
    await issue.issueMembershipCard({ enrollmentId: enrollment.id });
    const first = await prisma!.membershipEnrollment.findUnique({
      where: { id: enrollment.id },
      select: { cardIssuedAt: true },
    });

    sent.length = 0;
    const forced = await issue.issueMembershipCard({ enrollmentId: enrollment.id, force: true });
    assert.equal(forced.issued, true);
    assert.equal(sent.length, 1);

    const after = await prisma!.membershipEnrollment.findUnique({
      where: { id: enrollment.id },
      select: { cardIssuedAt: true },
    });
    assert.deepEqual(after?.cardIssuedAt, first?.cardIssuedAt);
  });

  it("refuses a removed enrollment", async (t) => {
    if (!prisma) return t.skip();
    const enrollment = await makeEnrollment({ status: "REMOVED" });
    sent.length = 0;
    const result = await issue.issueMembershipCard({ enrollmentId: enrollment.id });
    assert.equal(result.issued, false);
    assert.equal(sent.length, 0);
  });

  it("groups the email body by country", async (t) => {
    if (!prisma) return t.skip();
    const enrollment = await makeEnrollment();
    sent.length = 0;
    await issue.issueMembershipCard({ enrollmentId: enrollment.id });

    const body = sent[0].text;
    const names = await prisma!.country.findMany({
      where: { id: { in: [countryId, czCountryId] } },
      select: { code: true },
    });
    // Both configured countries appear as their own heading in the body.
    //
    // Resolved through the same helper the builder uses, because these fixture
    // countries carry synthetic codes: `Intl.DisplayNames.of` throws on them,
    // and the helper's fallback to the raw code is exactly the behaviour that
    // keeps one malformed row from costing an import its whole batch of cards.
    const { countryDisplayName } = await import("./membership-card-content.js");
    for (const { code } of names) {
      const display = countryDisplayName(code, "EN");
      assert.ok(body.includes(display), `expected a heading for ${code} in:\n${body}`);
    }
    assert.equal(new Set(names.map((n) => n.code)).size, 2, "two countries, two headings");
  });

  it("states that current terms live in the portal", async (t) => {
    if (!prisma) return t.skip();
    // Without this line the email becomes the contract, and a partner changing
    // a country's benefits next month leaves members holding the old promise.
    const enrollment = await makeEnrollment();
    sent.length = 0;
    await issue.issueMembershipCard({ enrollmentId: enrollment.id });
    assert.match(sent[0].text, /member portal/i);
  });

  it("writes in the linked account's language, not the CSV's", async (t) => {
    if (!prisma) return t.skip();
    const user = await prisma!.user.create({
      data: {
        email: `card-locale-${uniq}@example.com`,
        fullName: "Alex Doyle",
        role: "PATIENT",
        passwordHash: "x",
        emailVerifiedAt: new Date(),
        preferredLocale: "DE",
      },
    });
    userIds.push(user.id);
    const enrollment = await makeEnrollment({
      email: user.email,
      userId: user.id,
      status: "ACTIVE",
      preferredLocale: "CS",
    });

    sent.length = 0;
    await issue.issueMembershipCard({ enrollmentId: enrollment.id });
    assert.equal(sent.length, 1);
    // German subject line, not Czech — the account beats the spreadsheet.
    assert.match(sent[0].subject, /Mitgliedskarte/);
  });

  it("sends the invite in the enrollment's language, not the plan country's", async (t) => {
    if (!prisma) return t.skip();
    // The plan's primary country defaults to EN; the admin set CS on the member.
    const enrollment = await makeEnrollment({ preferredLocale: "CS" });
    sent.length = 0;
    await enrollments.sendMembershipEnrollmentInvite(enrollment.id, null);
    assert.equal(sent.length, 1);
    assert.match(sent[0].subject, /Byli jste zaregistrov/);
  });

  it("gives a dependent its own card and its own email (§43)", async (t) => {
    if (!prisma) return t.skip();
    const primary = await makeEnrollment({ levelId: sharedLevelId });
    await issue.issueMembershipCard({ enrollmentId: primary.id });

    sent.length = 0;
    const suffix = Math.random().toString(36).slice(2, 8);
    const dependent = await enrollments.addMembershipDependent(
      primary.id,
      {
        email: `dep-${suffix}@example.com`,
        firstName: "Sam",
        lastName: "Doyle",
        relationship: "spouse",
      } as never,
      null,
    );

    assert.equal(sent.length, 1, "the dependent gets their own email, not the primary's");
    assert.equal(sent[0].to, `dep-${suffix}@example.com`);
    assert.ok(sent[0].attachments?.[0], "and their own card");

    const row = await prisma!.membershipEnrollment.findUnique({
      where: { id: dependent!.id },
      select: { cardIssuedAt: true, membershipId: true },
    });
    assert.ok(row?.cardIssuedAt);
    assert.match(row!.membershipId, /-D1$/, "the family link stays visible in the id");
  });

  it("never promises a shared dependent the primary's units (§43)", async (t) => {
    if (!prisma) return t.skip();
    const primary = await makeEnrollment({ levelId: sharedLevelId });
    sent.length = 0;
    const suffix = Math.random().toString(36).slice(2, 8);
    await enrollments.addMembershipDependent(
      primary.id,
      {
        email: `share-${suffix}@example.com`,
        firstName: "Robin",
        lastName: "Doyle",
        relationship: "child",
      } as never,
      null,
    );

    const body = sent[0].text;
    assert.match(body, /shared with your primary member/);
    assert.match(body, /shared across your family membership/);
  });

  it("does NOT mail a member-added dependent (§25)", async (t) => {
    if (!prisma) return t.skip();
    // The one enrollment path that has passed no admin. The address is
    // member-typed and unverified; auto-sending would make the portal a way to
    // send branded mail with a PDF attachment to arbitrary addresses. The card
    // still issues — on linking, via the linker.
    const owner = await prisma!.user.create({
      data: {
        email: `owner-${uniq}@example.com`,
        fullName: "Owner",
        role: "PATIENT",
        passwordHash: "x",
        emailVerifiedAt: new Date(),
      },
    });
    userIds.push(owner.id);
    const primary = await makeEnrollment({
      levelId: sharedLevelId,
      userId: owner.id,
      status: "ACTIVE",
    });

    sent.length = 0;
    const suffix = Math.random().toString(36).slice(2, 8);
    const dependent = await enrollments.addMemberDependent(owner.id, primary.id, {
      email: `member-added-${suffix}@example.com`,
      firstName: "Jo",
      lastName: "Doyle",
      relationship: "child",
    });

    assert.equal(sent.length, 0, "a member-typed address must not be auto-mailed");
    const row = await prisma!.membershipEnrollment.findUnique({
      where: { id: dependent!.id },
      select: { cardIssuedAt: true },
    });
    assert.equal(row?.cardIssuedAt, null, "and the dedupe stays open so linking can issue it");

    // …and linking that dependent's own account is what issues it (§25).
    const depUser = await prisma!.user.create({
      data: {
        email: `member-added-${suffix}@example.com`,
        fullName: "Jo Doyle",
        role: "PATIENT",
        passwordHash: "x",
        emailVerifiedAt: new Date(),
      },
    });
    userIds.push(depUser.id);
    sent.length = 0;
    const linking = await import("./membership-linking.service.js");
    await linking.linkMembershipsForUser(depUser.id);

    assert.equal(sent.length, 1, "linking issues the card the member path withheld");
    assert.ok(sent[0].attachments?.[0], "and it carries the PDF, not just a notice");
    const linked = await prisma!.membershipEnrollment.findUnique({
      where: { id: dependent!.id },
      select: { cardIssuedAt: true },
    });
    assert.ok(linked?.cardIssuedAt);
  });

  it("does NOT render a card on the login path for an already-carded row", async (t) => {
    if (!prisma) return t.skip();
    // The linker is on email-verification and login. A card render is a
    // Chromium page, so rendering for every linking member would put ~a second
    // on every member's first login. Every row except a member-added dependent
    // already holds its card by the time it links, so this must take the
    // plain-confirmation branch and render nothing.
    const user = await prisma.user.create({
      data: {
        email: `carded-link-${uniq}@example.com`,
        fullName: "Pat Doyle",
        role: "PATIENT",
        passwordHash: "x",
        emailVerifiedAt: new Date(),
      },
    });
    userIds.push(user.id);
    await makeEnrollment({
      email: user.email,
      status: "PENDING",
      cardIssuedAt: new Date(),
      createdByAdminId: null,
      importBatchId: null,
      membershipId: `GH-CARDED-${uniq}`.slice(0, 40),
    });

    sent.length = 0;
    const linking = await import("./membership-linking.service.js");
    await linking.linkMembershipsForUser(user.id);

    assert.equal(sent.length, 1);
    assert.equal(
      sent[0].attachments?.length ?? 0,
      0,
      "an already-carded row gets the plain confirmation, with no render",
    );
  });
});

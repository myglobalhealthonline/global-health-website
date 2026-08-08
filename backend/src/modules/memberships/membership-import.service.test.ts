import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { parseCsv, summarize, type PreviewData } from "./membership-import.service.js";

/**
 * §8 — CSV import. The parser tests are pure; everything else needs a database
 * and skips without one.
 *
 * The properties that matter most here are the ones a careless implementation
 * gets wrong quietly: preview writes nothing, commit reads server-side
 * `previewData`, the claim makes commit/cancel single-winner and idempotent,
 * and `LINK` requires a VERIFIED account — the import is the path an attacker
 * controls, since they choose the email.
 */

describe("parseCsv", () => {
  it("reads a plain file", () => {
    assert.deepEqual(parseCsv("a,b\n1,2"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    assert.deepEqual(parseCsv('a,b\n"Doe, Jane",2'), [
      ["a", "b"],
      ["Doe, Jane", "2"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    assert.deepEqual(parseCsv('a\n"She said ""hi"""'), [["a"], ['She said "hi"']]);
  });

  it("keeps newlines inside quoted fields", () => {
    assert.deepEqual(parseCsv('a,b\n"line1\nline2",2'), [
      ["a", "b"],
      ["line1\nline2", "2"],
    ]);
  });

  it("handles CRLF and a UTF-8 BOM", () => {
    assert.deepEqual(parseCsv("﻿a,b\r\n1,2\r\n"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops trailing blank lines that every spreadsheet export adds", () => {
    assert.deepEqual(parseCsv("a,b\n1,2\n\n\n"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("summarize", () => {
  it("counts each outcome", () => {
    const rows = [
      { outcome: "CREATE", willEmail: true },
      { outcome: "CREATE", willEmail: true },
      { outcome: "LINK", willEmail: true },
      { outcome: "REVIVE", willEmail: true },
      { outcome: "REJECT", willEmail: true },
    ] as PreviewData["rows"];
    assert.deepEqual(summarize(rows), {
      create: 2,
      link: 1,
      revive: 1,
      reject: 1,
      warned: 0,
      recipients: 4,
    });
  });

  /**
   * §25's whole safety argument is that the admin sees the blast radius before
   * the send, so this number has to be the number of emails — not the number
   * of rows. Two things make them differ, and both appear on a re-import.
   */
  it("counts recipients, not rows: a REJECT emails nobody and a re-issued card is not re-sent", () => {
    const rows = [
      { outcome: "CREATE", willEmail: true },
      // Already had their card: reviving them must not email them twice.
      { outcome: "REVIVE", willEmail: false },
      // Rejected rows apply nothing at all, so they cannot email.
      { outcome: "REJECT", willEmail: true },
    ] as PreviewData["rows"];
    const counts = summarize(rows);
    assert.equal(counts.recipients, 1, "one email, from three rows");
  });

  it("counts rows carrying a warning without treating them as failures", () => {
    const rows = [
      { outcome: "CREATE", willEmail: true, warnings: ["Locale \"XX\" is not configured"] },
      { outcome: "CREATE", willEmail: true, warnings: [] },
      { outcome: "CREATE", willEmail: true },
    ] as PreviewData["rows"];
    const counts = summarize(rows);
    assert.equal(counts.warned, 1);
    assert.equal(counts.reject, 0, "a warning is not a rejection");
    assert.equal(counts.recipients, 3, "and it does not stop the email either");
  });
});

describe("membership import (database)", () => {
  let prisma: PrismaClient | null = null;
  let svc: typeof import("./membership-import.service.js");

  const uniq = `imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let currencyId = "";
  let countryId = "";
  let planId = "";
  let defaultLevelId = "";
  let familyLevelId = "";
  const userIds: string[] = [];

  // Phase 7c: `membershipId` is gone from the required set — it is generated —
  // and the column name a partner's own export uses aliases onto
  // `partnerReference`. `primaryEmail` is how a dependent names a primary this
  // same file creates, since that primary has no id until commit.
  const HEADER =
    "partnerReference,email,firstName,lastName,level,startDate,endDate,primaryMembershipId,primaryEmail,relationship,locale";
  const row = (values: Partial<Record<string, string>>): string =>
    [
      values.partnerReference ?? values.membershipId ?? "",
      values.email ?? "",
      values.firstName ?? "",
      values.lastName ?? "",
      values.level ?? "",
      values.startDate ?? "2026-01-01",
      values.endDate ?? "",
      values.primaryMembershipId ?? "",
      values.primaryEmail ?? "",
      values.relationship ?? "",
      values.locale ?? "",
    ].join(",");

  const preview = (csv: string) =>
    svc.previewMembershipImport({ planId, fileName: "members.csv", csv, adminId: null });

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      prisma = null;
      return;
    }
    svc = await import("./membership-import.service.js");
    const emailModule = await import("../../lib/email/send-email.js");
    emailModule.setEmailCaptureHook(() => {});

    const currency = await prisma.currency.create({
      data: { code: `I${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: `i${uniq}`.slice(0, 8).toLowerCase(),
        name: `Import Test ${uniq}`,
        slug: `import-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/ilg-${uniq}`,
        teamPath: `/itm-${uniq}`,
        generalConsultationPath: `/ign-${uniq}`,
        specialistConsultationPath: `/isp-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryId = country.id;
    const plan = await prisma.membershipPlan.create({
      data: { primaryCountryId: countryId, countries: { create: { countryId } }, slug: `import-plan-${uniq}`, name: "Import Plan" },
    });
    planId = plan.id;
    const level = await prisma.membershipLevel.create({
      data: { planId, slug: "standard", name: "Standard", isDefault: true },
    });
    defaultLevelId = level.id;
    const family = await prisma.membershipLevel.create({
      data: {
        planId,
        slug: "family",
        name: "Family",
        familyEnabled: true,
        maxDependents: 1,
      },
    });
    familyLevelId = family.id;
  });

  after(async () => {
    if (!prisma) return;
    (await import("../../lib/email/send-email.js")).setEmailCaptureHook(null);
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipImportBatch.deleteMany({ where: { planId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  async function clearEnrollments() {
    await prisma!.membershipEnrollment.deleteMany({ where: { planId } });
  }

  function rowsOf(batch: { previewData: unknown }): PreviewData["rows"] {
    return (batch.previewData as unknown as PreviewData).rows;
  }

  it("previews without writing a single enrollment", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const csv = [
      HEADER,
      row({ partnerReference: "IMP-1", email: `a-${uniq}@test.local`, firstName: "A", lastName: "One" }),
      row({ partnerReference: "IMP-2", email: `b-${uniq}@test.local`, firstName: "B", lastName: "Two" }),
    ].join("\n");

    const batch = await preview(csv);
    assert.equal(batch.status, "PREVIEW");
    assert.equal(batch.rowCount, 2);
    assert.equal(await prisma.membershipEnrollment.count({ where: { planId } }), 0);
  });

  it("rejects a malformed email and a missing name", async (t) => {
    if (!prisma) return t.skip();
    const csv = [
      HEADER,
      row({ partnerReference: "IMP-3", email: "not-an-email", firstName: "A", lastName: "One" }),
      row({ partnerReference: "IMP-4", email: `c-${uniq}@test.local`, firstName: "", lastName: "Two" }),
      // A two-character reference used to be rejected as a too-short id.
      // Since 7c it is just a short partner number, which is their business.
      row({ partnerReference: "X", email: `d-${uniq}@test.local`, firstName: "C", lastName: "Three" }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.deepEqual(
      rows.map((r) => r.outcome),
      ["REJECT", "REJECT", "CREATE"],
    );
    assert.match(rows[0].reason ?? "", /email/i);
    assert.match(rows[1].reason ?? "", /name/i);
    assert.equal(rows[2].partnerReference, "X");
  });

  it("warns on a duplicate partner reference and rejects a duplicate email, case-insensitively", async (t) => {
    if (!prisma) return t.skip();
    const email = `dup-${uniq}@test.local`;
    const csv = [
      HEADER,
      row({ partnerReference: "DUP-1", email, firstName: "A", lastName: "One" }),
      // A repeated PARTNER REFERENCE is a warning, never a rejection: the same
      // number legitimately appears in more than one plan (§21.5), so inside
      // one file it is a likely copy-paste error, not a reason to refuse a row.
      row({ partnerReference: "dup-1", email: `other-${uniq}@test.local`, firstName: "B", lastName: "Two" }),
      // A repeated EMAIL still is a rejection — it is the linking key, and two
      // rows for one address in one plan cannot both be applied.
      row({ partnerReference: "DUP-2", email: email.toUpperCase(), firstName: "C", lastName: "Three" }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.equal(rows[0].outcome, "CREATE");
    assert.equal(rows[1].outcome, "CREATE", "a duplicate reference does not block the row");
    assert.match((rows[1].warnings ?? []).join(" "), /more than once in this file/i);
    assert.equal(rows[2].outcome, "REJECT");
    assert.match(rows[2].reason ?? "", /email within this file/i);
  });

  it("rejects an unknown level slug and an inverted term", async (t) => {
    if (!prisma) return t.skip();
    const csv = [
      HEADER,
      row({
        membershipId: "LVL-1",
        email: `lvl-${uniq}@test.local`,
        firstName: "A",
        lastName: "One",
        level: "platinum",
      }),
      row({
        membershipId: "LVL-2",
        email: `lvl2-${uniq}@test.local`,
        firstName: "B",
        lastName: "Two",
        startDate: "2026-06-01",
        endDate: "2026-01-01",
      }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.match(rows[0].reason ?? "", /Unknown level/i);
    assert.match(rows[1].reason ?? "", /End date/i);
  });

  /**
   * §25. The plan's primary-country default alone would welcome every Irish
   * member of a Czech-primary plan in Czech, so the partner gets to say — and
   * getting it wrong must cost them the language, not the row.
   */
  it("takes a supported locale off the row and ignores an unsupported one with a warning", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    await prisma.countryLocale.create({ data: { countryId, locale: "PT" } });
    const csv = [
      HEADER,
      row({ email: `loc1-${uniq}@test.local`, firstName: "A", lastName: "One", locale: "PT" }),
      // Configured nowhere for this country: warn, do not reject.
      row({ email: `loc2-${uniq}@test.local`, firstName: "B", lastName: "Two", locale: "CS" }),
      // Not a locale at all.
      row({ email: `loc3-${uniq}@test.local`, firstName: "C", lastName: "Three", locale: "klingon" }),
      // Absent: falls back at send time, and carries no warning.
      row({ email: `loc4-${uniq}@test.local`, firstName: "D", lastName: "Four" }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.deepEqual(
      rows.map((r) => r.outcome),
      ["CREATE", "CREATE", "CREATE", "CREATE"],
      "an unrecognised language never costs the admin a row",
    );
    assert.equal(rows[0].preferredLocale, "PT");
    assert.equal(rows[1].preferredLocale, null);
    assert.match((rows[1].warnings ?? []).join(" "), /not configured/i);
    assert.equal(rows[2].preferredLocale, null);
    assert.match((rows[2].warnings ?? []).join(" "), /not configured/i);
    assert.equal(rows[3].preferredLocale, null);
    assert.deepEqual(rows[3].warnings, [], "no locale asked for is not a problem");
  });

  it("stores the chosen locale on the enrollment so a later resend can read it", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const email = `locstore-${uniq}@test.local`;
    const csv = [HEADER, row({ email, firstName: "A", lastName: "One", locale: "EN" })].join("\n");
    const batch = await preview(csv);
    await svc.commitMembershipImport(batch.id, null);

    const stored = await prisma.membershipEnrollment.findFirst({ where: { planId, email } });
    assert.equal(stored?.preferredLocale, "EN");
  });

  /**
   * The number §25 exists to show. It is emails, not rows: a rejected row
   * applies nothing, and reviving someone who already has their card must not
   * send them a second one (§41's dedupe).
   */
  it("reports the recipient count, excluding rejects and already-carded revives", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const carded = `carded-${uniq}@test.local`;
    const fresh = `freshrevive-${uniq}@test.local`;
    await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: defaultLevelId,
        countryId,
        membershipId: `RC1-${uniq}`.toUpperCase(),
        email: carded,
        firstName: "Had",
        lastName: "Card",
        startDate: new Date("2026-01-01"),
        status: "REMOVED",
        cardIssuedAt: new Date("2026-02-01"),
      },
    });
    await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: defaultLevelId,
        countryId,
        membershipId: `RC2-${uniq}`.toUpperCase(),
        email: fresh,
        firstName: "No",
        lastName: "Card",
        startDate: new Date("2026-01-01"),
        status: "REMOVED",
      },
    });

    const csv = [
      HEADER,
      row({ email: `new-${uniq}@test.local`, firstName: "A", lastName: "One" }),
      row({ email: carded, firstName: "Had", lastName: "Card" }),
      row({ email: fresh, firstName: "No", lastName: "Card" }),
      row({ email: "not-an-email", firstName: "Bad", lastName: "Row" }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    const counts = svc.summarize(rows);
    assert.equal(counts.reject, 1);
    assert.equal(counts.revive, 2);
    assert.equal(
      counts.recipients,
      2,
      "the new member and the un-carded revive — not the rejected row, not the one already carded",
    );
    assert.equal(rows.find((r) => r.email === carded)?.willEmail, false);
    assert.equal(rows.find((r) => r.email === fresh)?.willEmail, true);
  });

  it("a re-import of the same file emails nobody the second time", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const email = `reimport-${uniq}@test.local`;
    const csv = [HEADER, row({ email, firstName: "A", lastName: "One" })].join("\n");

    const first = await preview(csv);
    assert.equal(svc.summarize(rowsOf(first)).recipients, 1);
    await svc.commitMembershipImport(first.id, null);
    // 7d issues the card at commit; 7c only lands the flag it reads.
    await prisma.membershipEnrollment.updateMany({
      where: { planId, email },
      data: { cardIssuedAt: new Date() },
    });

    // Same file again. The row is now LIVE, so it is rejected outright — the
    // strongest form of "emails nobody twice".
    const second = await preview(csv);
    const secondRows = rowsOf(second);
    assert.equal(secondRows[0].outcome, "REJECT");
    assert.equal(svc.summarize(secondRows).recipients, 0);

    // …and if the member is removed and re-imported, the carded flag is what
    // stops the second send rather than the rejection.
    await prisma.membershipEnrollment.updateMany({
      where: { planId, email },
      data: { status: "REMOVED" },
    });
    const third = rowsOf(await preview(csv));
    assert.equal(third[0].outcome, "REVIVE");
    assert.equal(third[0].willEmail, false);
    assert.equal(svc.summarize(third).recipients, 0);
  });

  it("resolves a named level, and defaults to the plan's default level", async (t) => {
    if (!prisma) return t.skip();
    const csv = [
      HEADER,
      row({ partnerReference: "SET-1", email: `s1-${uniq}@test.local`, firstName: "A", lastName: "One", level: "family" }),
      row({ partnerReference: "SET-2", email: `s2-${uniq}@test.local`, firstName: "B", lastName: "Two" }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.equal(rows[0].levelId, familyLevelId);
    assert.equal(rows[1].levelId, defaultLevelId);
  });

  it("marks LINK only for a VERIFIED account; an unverified one stays CREATE", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const verifiedEmail = `ver-${uniq}@test.local`;
    const unverifiedEmail = `unver-${uniq}@test.local`;
    const verified = await prisma.user.create({
      data: {
        email: verifiedEmail,
        passwordHash: "x",
        fullName: "Verified",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    const unverified = await prisma.user.create({
      data: { email: unverifiedEmail, passwordHash: "x", fullName: "Unverified", role: "PATIENT" },
    });
    userIds.push(verified.id, unverified.id);

    const csv = [
      HEADER,
      row({ partnerReference: "LNK-1", email: verifiedEmail, firstName: "A", lastName: "One" }),
      row({ partnerReference: "LNK-2", email: unverifiedEmail, firstName: "B", lastName: "Two" }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.equal(rows[0].outcome, "LINK");
    assert.equal(rows[1].outcome, "CREATE", "an unverified account must not be linked by import");
  });

  it("commits the batch, and the unverified row lands PENDING while the verified one is ACTIVE", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const verifiedEmail = `cver-${uniq}@test.local`;
    const unverifiedEmail = `cunver-${uniq}@test.local`;
    const verified = await prisma.user.create({
      data: {
        email: verifiedEmail,
        passwordHash: "x",
        fullName: "Verified",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    const unverified = await prisma.user.create({
      data: { email: unverifiedEmail, passwordHash: "x", fullName: "Unverified", role: "PATIENT" },
    });
    userIds.push(verified.id, unverified.id);

    const csv = [
      HEADER,
      row({ partnerReference: "CMT-1", email: verifiedEmail, firstName: "A", lastName: "One" }),
      row({ partnerReference: "CMT-2", email: unverifiedEmail, firstName: "B", lastName: "Two" }),
    ].join("\n");
    const batch = await preview(csv);
    const result = await svc.commitMembershipImport(batch.id, null);

    assert.equal(result.claimed, true);
    assert.equal(result.claimed && result.created, 2);
    // Found by the PARTNER's number now — ours is generated at commit and is
    // not knowable from the file (§21.5).
    const linked = await prisma.membershipEnrollment.findFirst({
      where: { planId, partnerReference: "CMT-1" },
    });
    const pending = await prisma.membershipEnrollment.findFirst({
      where: { planId, partnerReference: "CMT-2" },
    });
    // Prefixed from the plan slug (`import-plan-…` → `IMPO`) and suffixed with
    // 8 base32 characters, drawn from an alphabet with no I, L, O or U.
    assert.match(linked?.membershipId ?? "", /^IMPO-[0-9A-HJKMNP-TV-Z]{8}$/);
    assert.notEqual(linked?.membershipId, pending?.membershipId);
    assert.equal(linked?.status, "ACTIVE");
    assert.equal(linked?.userId, verified.id);
    assert.equal(pending?.status, "PENDING");
    assert.equal(pending?.userId, null);
  });

  it("rejects an email already enrolled; a reused partner reference is fine", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const taken = `taken-${uniq}@test.local`;
    await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: defaultLevelId,
        countryId,
        membershipId: "HELD-1",
        email: taken,
        firstName: "Held",
        lastName: "Member",
        startDate: new Date("2026-01-01"),
        status: "PENDING",
      },
    });

    const csv = [
      HEADER,
      row({ partnerReference: "NEW-1", email: taken.toUpperCase(), firstName: "A", lastName: "One" }),
      row({ partnerReference: "held-1", email: `fresh-${uniq}@test.local`, firstName: "B", lastName: "Two" }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.match(rows[0].reason ?? "", /already enrolled/i);
    // `held-1` matches an existing row's PARTNER reference, which is not a key
    // and never was globally unique (§21.5) — nothing to collide with.
    assert.equal(rows[1].outcome, "CREATE");
  });

  it("revives a REMOVED row, keeping its id while overwriting names, level and term", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const email = `revive-${uniq}@test.local`;
    const removed = await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: defaultLevelId,
        countryId,
        membershipId: "OLD-ID-1",
        email,
        firstName: "Old",
        lastName: "Name",
        startDate: new Date("2020-01-01"),
        endDate: new Date("2021-01-01"),
        status: "REMOVED",
      },
    });

    const csv = [
      HEADER,
      row({
        membershipId: "NEW-ID-1",
        email,
        firstName: "New",
        lastName: "Name",
        level: "family",
        startDate: "2026-02-01",
      }),
    ].join("\n");
    const batch = await preview(csv);
    const rows = rowsOf(batch);
    assert.equal(rows[0].outcome, "REVIVE");
    assert.equal(rows[0].existingEnrollmentId, removed.id);

    const result = await svc.commitMembershipImport(batch.id, null);
    assert.equal(result.claimed && result.revived, 1);

    const after = await prisma.membershipEnrollment.findUnique({ where: { id: removed.id } });
    // The generated id is this ROW's identity and survives a revive: the same
    // person is coming back, and reissuing would invalidate a card they may
    // still be holding. What a returning member brings is a new PARTNER
    // number, and that is what gets overwritten (§8.2, restated for 7c).
    assert.equal(after?.membershipId, "OLD-ID-1", "the generated id is kept");
    assert.equal(after?.partnerReference, "NEW-ID-1", "the partner's number is refreshed");
    assert.equal(after?.firstName, "New");
    assert.equal(after?.levelId, familyLevelId);
    assert.equal(after?.status, "PENDING");
    assert.equal(after?.endDate, null);
    assert.equal(
      await prisma.membershipEnrollment.count({ where: { planId, email } }),
      1,
      "revived, not duplicated",
    );
  });

  it("creates a dependent whose primary is in the same file, primaries first", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const primaryEmail = `fam-${uniq}@test.local`;
    const childEmail = `kid-${uniq}@test.local`;
    const csv = [
      HEADER,
      // Dependent listed BEFORE its primary — commit must still order correctly.
      row({
        membershipId: "FAM-1-D",
        email: childEmail,
        firstName: "Kid",
        lastName: "Family",
        // Named by EMAIL, because the primary's generated id will not exist
        // until this same commit creates it (§21.5).
        primaryEmail,
        relationship: "child",
      }),
      row({
        membershipId: "FAM-1",
        email: primaryEmail,
        firstName: "Parent",
        lastName: "Family",
        level: "family",
      }),
    ].join("\n");

    const batch = await preview(csv);
    const result = await svc.commitMembershipImport(batch.id, null);
    assert.equal(result.claimed, true);

    const primary = await prisma.membershipEnrollment.findFirst({
      where: { planId, email: primaryEmail },
    });
    const dependent = await prisma.membershipEnrollment.findFirst({
      where: { planId, email: childEmail },
    });
    assert.ok(primary);
    assert.equal(dependent?.memberType, "DEPENDENT");
    assert.equal(dependent?.primaryEnrollmentId, primary!.id);
    assert.equal(dependent?.levelId, primary!.levelId, "a dependent inherits the level");
    assert.equal(
      dependent?.startDate.toISOString(),
      primary!.startDate.toISOString(),
      "a dependent inherits the term",
    );
  });

  it("rejects a dependent over the level's cap, counting existing rows plus this file", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const parent = await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: familyLevelId,
        countryId,
        membershipId: "CAP-1",
        email: `cap-${uniq}@test.local`,
        firstName: "Cap",
        lastName: "Parent",
        startDate: new Date("2026-01-01"),
        status: "PENDING",
      },
    });
    await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: familyLevelId,
        countryId,
        membershipId: "CAP-1-D1",
        email: `cap-d1-${uniq}@test.local`,
        firstName: "First",
        lastName: "Child",
        startDate: new Date("2026-01-01"),
        status: "PENDING",
        memberType: "DEPENDENT",
        primaryEnrollmentId: parent.id,
      },
    });

    const csv = [
      HEADER,
      row({
        membershipId: "CAP-1-D2",
        email: `cap-d2-${uniq}@test.local`,
        firstName: "Second",
        lastName: "Child",
        primaryMembershipId: "CAP-1",
      }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.match(rows[0].reason ?? "", /limit of 1 dependent/i);
  });

  it("rejects a dependent whose level has no family cover, and an unknown primary", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: defaultLevelId,
        countryId,
        membershipId: "SOLO-1",
        email: `solo-${uniq}@test.local`,
        firstName: "Solo",
        lastName: "Member",
        startDate: new Date("2026-01-01"),
        status: "PENDING",
      },
    });

    const csv = [
      HEADER,
      row({
        membershipId: "SOLO-1-D",
        email: `solo-d-${uniq}@test.local`,
        firstName: "Kid",
        lastName: "Member",
        primaryMembershipId: "SOLO-1",
      }),
      row({
        membershipId: "GHOST-D",
        email: `ghost-${uniq}@test.local`,
        firstName: "Ghost",
        lastName: "Member",
        primaryMembershipId: "NOT-THERE",
      }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.match(rows[0].reason ?? "", /family cover/i);
    assert.match(rows[1].reason ?? "", /not found/i);
  });

  it("applies once when two commits race, and the loser gets the current state", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const csv = [
      HEADER,
      row({ partnerReference: "RACE-1", email: `race-${uniq}@test.local`, firstName: "A", lastName: "One" }),
    ].join("\n");
    const batch = await preview(csv);

    const [first, second] = await Promise.all([
      svc.commitMembershipImport(batch.id, null),
      svc.commitMembershipImport(batch.id, null),
    ]);
    const winners = [first, second].filter((r) => r.claimed);
    assert.equal(winners.length, 1, "exactly one commit applies");
    assert.equal(await prisma.membershipEnrollment.count({ where: { planId } }), 1);
    const loser = [first, second].find((r) => !r.claimed)!;
    assert.equal(loser.batch.status, "COMMITTED");
  });

  it("is idempotent: re-committing a committed batch changes nothing", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const csv = [
      HEADER,
      row({ partnerReference: "IDEM-1", email: `idem-${uniq}@test.local`, firstName: "A", lastName: "One" }),
    ].join("\n");
    const batch = await preview(csv);
    await svc.commitMembershipImport(batch.id, null);

    const again = await svc.commitMembershipImport(batch.id, null);
    assert.equal(again.claimed, false);
    assert.equal(again.batch.status, "COMMITTED");
    assert.equal(await prisma.membershipEnrollment.count({ where: { planId } }), 1);
  });

  it("commit and cancel cannot both win", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const csv = [
      HEADER,
      row({ partnerReference: "CXL-1", email: `cxl-${uniq}@test.local`, firstName: "A", lastName: "One" }),
    ].join("\n");
    const batch = await preview(csv);

    const [commit, cancel] = await Promise.all([
      svc.commitMembershipImport(batch.id, null),
      svc.cancelMembershipImport(batch.id),
    ]);
    assert.equal(Number(commit.claimed) + Number(cancel.claimed), 1, "exactly one transition wins");

    const final = await svc.getMembershipImportBatch(batch.id);
    const enrolled = await prisma.membershipEnrollment.count({ where: { planId } });
    assert.equal(enrolled, final.status === "COMMITTED" ? 1 : 0, "rows exist iff the commit won");
  });

  it("a cancelled batch cannot be committed afterwards", async (t) => {
    if (!prisma) return t.skip();
    await clearEnrollments();
    const csv = [
      HEADER,
      row({ partnerReference: "CXL-2", email: `cxl2-${uniq}@test.local`, firstName: "A", lastName: "One" }),
    ].join("\n");
    const batch = await preview(csv);
    await svc.cancelMembershipImport(batch.id);

    const commit = await svc.commitMembershipImport(batch.id, null);
    assert.equal(commit.claimed, false);
    assert.equal(commit.batch.status, "CANCELLED");
    assert.equal(await prisma.membershipEnrollment.count({ where: { planId } }), 0);
  });

  it("refuses a file over the row cap, and one with a missing required column", async (t) => {
    if (!prisma) return t.skip();
    const tooMany = [
      HEADER,
      ...Array.from({ length: svc.MEMBERSHIP_IMPORT_ROW_CAP + 1 }, (_unused, i) =>
        row({ partnerReference: `CAP${i}`, email: `cap${i}-${uniq}@test.local`, firstName: "A", lastName: "B" }),
      ),
    ].join("\n");
    await assert.rejects(() => preview(tooMany), /limit is 2000/i);

    await assert.rejects(
      () => preview("membershipId,firstName,lastName\nX-1,A,B"),
      /Missing required column: email/i,
    );
  });
});

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
      { outcome: "CREATE" },
      { outcome: "CREATE" },
      { outcome: "LINK" },
      { outcome: "REVIVE" },
      { outcome: "REJECT" },
    ] as PreviewData["rows"];
    assert.deepEqual(summarize(rows), { create: 2, link: 1, revive: 1, reject: 1 });
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

  const HEADER = "membershipId,email,firstName,lastName,level,startDate,endDate,primaryMembershipId,relationship";
  const row = (values: Partial<Record<string, string>>): string =>
    [
      values.membershipId ?? "",
      values.email ?? "",
      values.firstName ?? "",
      values.lastName ?? "",
      values.level ?? "",
      values.startDate ?? "2026-01-01",
      values.endDate ?? "",
      values.primaryMembershipId ?? "",
      values.relationship ?? "",
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
      data: { countryId, slug: `import-plan-${uniq}`, name: "Import Plan" },
    });
    planId = plan.id;
    const level = await prisma.membershipLevel.create({
      data: { planId, countryId, slug: "standard", name: "Standard", isDefault: true },
    });
    defaultLevelId = level.id;
    const family = await prisma.membershipLevel.create({
      data: {
        planId,
        countryId,
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
    await prisma.membershipPlan.deleteMany({ where: { countryId } });
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
      row({ membershipId: "IMP-1", email: `a-${uniq}@test.local`, firstName: "A", lastName: "One" }),
      row({ membershipId: "IMP-2", email: `b-${uniq}@test.local`, firstName: "B", lastName: "Two" }),
    ].join("\n");

    const batch = await preview(csv);
    assert.equal(batch.status, "PREVIEW");
    assert.equal(batch.rowCount, 2);
    assert.equal(await prisma.membershipEnrollment.count({ where: { planId } }), 0);
  });

  it("rejects a malformed email, a missing name and a short membership id", async (t) => {
    if (!prisma) return t.skip();
    const csv = [
      HEADER,
      row({ membershipId: "IMP-3", email: "not-an-email", firstName: "A", lastName: "One" }),
      row({ membershipId: "IMP-4", email: `c-${uniq}@test.local`, firstName: "", lastName: "Two" }),
      row({ membershipId: "X", email: `d-${uniq}@test.local`, firstName: "C", lastName: "Three" }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.deepEqual(
      rows.map((r) => r.outcome),
      ["REJECT", "REJECT", "REJECT"],
    );
    assert.match(rows[0].reason ?? "", /email/i);
    assert.match(rows[1].reason ?? "", /name/i);
    assert.match(rows[2].reason ?? "", /membership ID/i);
  });

  it("rejects duplicate ids and emails within the same file, case-insensitively", async (t) => {
    if (!prisma) return t.skip();
    const email = `dup-${uniq}@test.local`;
    const csv = [
      HEADER,
      row({ membershipId: "DUP-1", email, firstName: "A", lastName: "One" }),
      // Same id in a different case — the unique index is on lower().
      row({ membershipId: "dup-1", email: `other-${uniq}@test.local`, firstName: "B", lastName: "Two" }),
      row({ membershipId: "DUP-2", email: email.toUpperCase(), firstName: "C", lastName: "Three" }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.equal(rows[0].outcome, "CREATE");
    assert.equal(rows[1].outcome, "REJECT");
    assert.match(rows[1].reason ?? "", /membership ID within this file/i);
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

  it("resolves a named level, and defaults to the plan's default level", async (t) => {
    if (!prisma) return t.skip();
    const csv = [
      HEADER,
      row({ membershipId: "SET-1", email: `s1-${uniq}@test.local`, firstName: "A", lastName: "One", level: "family" }),
      row({ membershipId: "SET-2", email: `s2-${uniq}@test.local`, firstName: "B", lastName: "Two" }),
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
      row({ membershipId: "LNK-1", email: verifiedEmail, firstName: "A", lastName: "One" }),
      row({ membershipId: "LNK-2", email: unverifiedEmail, firstName: "B", lastName: "Two" }),
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
      row({ membershipId: "CMT-1", email: verifiedEmail, firstName: "A", lastName: "One" }),
      row({ membershipId: "CMT-2", email: unverifiedEmail, firstName: "B", lastName: "Two" }),
    ].join("\n");
    const batch = await preview(csv);
    const result = await svc.commitMembershipImport(batch.id, null);

    assert.equal(result.claimed, true);
    assert.equal(result.claimed && result.created, 2);
    const linked = await prisma.membershipEnrollment.findFirst({
      where: { planId, membershipId: "CMT-1" },
    });
    const pending = await prisma.membershipEnrollment.findFirst({
      where: { planId, membershipId: "CMT-2" },
    });
    assert.equal(linked?.status, "ACTIVE");
    assert.equal(linked?.userId, verified.id);
    assert.equal(pending?.status, "PENDING");
    assert.equal(pending?.userId, null);
  });

  it("rejects an email already enrolled, and an id held by another enrollment", async (t) => {
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
      row({ membershipId: "NEW-1", email: taken.toUpperCase(), firstName: "A", lastName: "One" }),
      row({ membershipId: "held-1", email: `fresh-${uniq}@test.local`, firstName: "B", lastName: "Two" }),
    ].join("\n");

    const rows = rowsOf(await preview(csv));
    assert.match(rows[0].reason ?? "", /already enrolled/i);
    assert.match(rows[1].reason ?? "", /already belongs to another enrollment/i);
  });

  it("revives a REMOVED row and overwrites its id, names, level and term", async (t) => {
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
    assert.equal(after?.membershipId, "NEW-ID-1", "a returning member brings a new partner id");
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
        primaryMembershipId: "FAM-1",
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
      where: { planId, membershipId: "FAM-1" },
    });
    const dependent = await prisma.membershipEnrollment.findFirst({
      where: { planId, membershipId: "FAM-1-D" },
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
      row({ membershipId: "RACE-1", email: `race-${uniq}@test.local`, firstName: "A", lastName: "One" }),
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
      row({ membershipId: "IDEM-1", email: `idem-${uniq}@test.local`, firstName: "A", lastName: "One" }),
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
      row({ membershipId: "CXL-1", email: `cxl-${uniq}@test.local`, firstName: "A", lastName: "One" }),
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
      row({ membershipId: "CXL-2", email: `cxl2-${uniq}@test.local`, firstName: "A", lastName: "One" }),
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
        row({ membershipId: `CAP${i}`, email: `cap${i}-${uniq}@test.local`, firstName: "A", lastName: "B" }),
      ),
    ].join("\n");
    await assert.rejects(() => preview(tooMany), /limit is 2000/i);

    await assert.rejects(
      () => preview("membershipId,firstName,lastName\nX-1,A,B"),
      /Missing required column: email/i,
    );
  });
});

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs } from "../src/test-utils/audit-cleanup.js";
import {
  applyLinkBackfill,
  collectLinkBackfillPlan,
} from "./backfill-patient-profile-user-links.js";

/**
 * Against the local test database, with the three shapes the production scan
 * actually has to tell apart: a chart that should be linked, one whose address
 * is ambiguous, and one that was erased under a deletion request.
 *
 * The suite runs against a shared database, so every assertion is scoped to
 * this run's own fixture ids — a bare `plan.candidates.length` would be a
 * count of whatever else happens to be unlinked in there.
 */
describe("backfill-patient-profile-user-links", () => {
  let prisma: PrismaClient;
  const uniq = `bppul-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const emails = {
    linkable: `${uniq}-linkable@example.test`,
    linkable2: `${uniq}-linkable2@example.test`,
    ambiguous: `${uniq}-ambiguous@example.test`,
    anonymized: `deleted-${uniq}@deleted.invalid`,
  };
  const userIds: string[] = [];
  const profileIds: string[] = [];
  const auditLogIds: string[] = [];
  let linkableUserId = "";
  let linkableProfileId = "";
  let linkable2UserId = "";
  let linkable2ProfileId = "";
  let ambiguousProfileId = "";
  let anonymizedProfileId = "";

  const mkUser = async (email: string) => {
    const user = await prisma.user.create({
      data: { email, passwordHash: "x", fullName: "Test", role: "PATIENT" },
      select: { id: true },
    });
    userIds.push(user.id);
    return user.id;
  };
  const mkProfile = async (
    email: string,
    extra: { userId?: string | null; anonymizedAt?: Date } = {},
  ) => {
    const profile = await prisma.patientProfile.create({
      data: { email, fullName: "Test", userId: extra.userId ?? null, ...("anonymizedAt" in extra ? { anonymizedAt: extra.anonymizedAt } : {}) },
      select: { id: true },
    });
    profileIds.push(profile.id);
    return profile.id;
  };

  before(async () => {
    ({ prisma } = await import("../src/db/prisma.js"));

    // 1. Linkable — one PATIENT account, chart unowned.
    linkableUserId = await mkUser(emails.linkable);
    linkableProfileId = await mkProfile(emails.linkable);
    // A second linkable chart, so the apply exercises the multi-tuple VALUES
    // path (placeholders past $2) — production runs it with hundreds.
    linkable2UserId = await mkUser(emails.linkable2);
    linkable2ProfileId = await mkProfile(emails.linkable2);

    // 2. Ambiguous — TWO PATIENT accounts answer to the same address, which
    //    only case variants can produce (User.email is unique). Neither is
    //    provably the owner, so the chart must be left alone.
    await mkUser(emails.ambiguous);
    await mkUser(emails.ambiguous.toUpperCase());
    ambiguousProfileId = await mkProfile(emails.ambiguous);

    // 3. Anonymized — erased under a data-deletion request. Linking it back
    //    to a live account would undo the erasure.
    await mkUser(emails.anonymized);
    anonymizedProfileId = await mkProfile(emails.anonymized, { anonymizedAt: new Date() });
  });

  after(async () => {
    // AuditLog is append-only (trigger 20260710000000) — cleanup needs the
    // reviewed-transaction override, which this helper owns.
    await deleteAuditLogs(prisma, { id: { in: auditLogIds } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("plans exactly the two links and skips the ambiguous and anonymized charts", async () => {
    const plan = await collectLinkBackfillPlan(prisma);

    const mine = plan.candidates
      .filter((c) => profileIds.includes(c.patientProfileId))
      .sort((a, b) => a.patientProfileId.localeCompare(b.patientProfileId));
    assert.deepEqual(
      mine,
      [
        { patientProfileId: linkableProfileId, userId: linkableUserId },
        { patientProfileId: linkable2ProfileId, userId: linkable2UserId },
      ].sort((a, b) => a.patientProfileId.localeCompare(b.patientProfileId)),
    );
    assert.ok(plan.skipped.AMBIGUOUS_MULTIPLE_USERS.includes(ambiguousProfileId));
    assert.ok(plan.skipped.ANONYMIZED_OR_TOMBSTONE.includes(anonymizedProfileId));
  });

  it("changes nothing when the plan is only collected (the dry-run path)", async () => {
    await collectLinkBackfillPlan(prisma);

    const rows = await prisma.patientProfile.findMany({
      where: { id: { in: profileIds } },
      select: { id: true, userId: true },
    });
    assert.deepEqual(
      rows.map((r) => r.userId),
      rows.map(() => null),
      "collecting the plan must not write",
    );
  });

  it("links exactly the two candidates on apply, and audits the run", async () => {
    // Scoped to this run's fixtures so the shared database's other unlinked
    // rows are neither counted nor touched.
    const full = await collectLinkBackfillPlan(prisma);
    const plan = {
      ...full,
      candidates: full.candidates.filter((c) => profileIds.includes(c.patientProfileId)),
    };

    const updated = await applyLinkBackfill(prisma, plan);
    assert.equal(updated, 2);

    const rows = await prisma.patientProfile.findMany({
      where: { id: { in: profileIds } },
      select: { id: true, userId: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r.userId]));
    assert.equal(byId.get(linkableProfileId), linkableUserId);
    assert.equal(byId.get(linkable2ProfileId), linkable2UserId);
    assert.equal(byId.get(ambiguousProfileId), null);
    assert.equal(byId.get(anonymizedProfileId), null);

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "PATIENT_PROFILE_USER_LINK_BACKFILL" },
      orderBy: { createdAt: "desc" },
      select: { id: true, metadata: true, actorRole: true },
    });
    assert.ok(audit, "the run must leave an audit row");
    auditLogIds.push(audit.id);
    assert.equal(audit.actorRole, "SYSTEM");
    const metadata = audit.metadata as Record<string, unknown>;
    assert.equal(metadata.updated, 2);
    assert.equal(metadata.candidates, 2);
    // Counts only — an address in the audit row would defeat the point.
    assert.ok(!JSON.stringify(metadata).includes("@"), "audit metadata must carry no address");
  });

  it("is idempotent — a second run finds nothing left to do", async () => {
    const plan = await collectLinkBackfillPlan(prisma);
    assert.deepEqual(
      plan.candidates.filter((c) => profileIds.includes(c.patientProfileId)),
      [],
    );
  });
});

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { linkPatientProfileToUserByEmail } from "./patient-profile-user-link.js";

/**
 * Regression cover for the leak found on 2026-09-07: every one of the 532
 * production PatientProfile rows with `userId: null` and a matching PATIENT
 * User was created by the 2026-07-16 legacy contact load, and the accounts
 * were minted a fortnight later by `scripts/patient-platform-invite.ts`,
 * which created the `User` and never claimed the waiting chart. The enforced
 * medical-access guard then denies those patients their own records.
 */
describe("linkPatientProfileToUserByEmail", () => {
  let prisma: PrismaClient;
  const uniq = `ppul-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const emails = {
    unlinked: `${uniq}-unlinked@example.test`,
    taken: `${uniq}-taken@example.test`,
    otherChart: `${uniq}-other-chart@example.test`,
  };
  const userIds: string[] = [];
  const profileIds: string[] = [];

  const mkUser = async (email: string) => {
    const u = await prisma.user.create({
      data: { email, passwordHash: "x", fullName: "Test", role: "PATIENT" },
      select: { id: true },
    });
    userIds.push(u.id);
    return u.id;
  };
  const mkProfile = async (email: string, userId: string | null) => {
    const p = await prisma.patientProfile.create({
      data: { email, userId, fullName: "Test" },
      select: { id: true },
    });
    profileIds.push(p.id);
    return p.id;
  };

  before(async () => {
    ({ prisma } = await import("../db/prisma.js"));
  });

  after(async () => {
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("claims an unlinked chart for the account holding the same address", async () => {
    const userId = await mkUser(emails.unlinked);
    const profileId = await mkProfile(emails.unlinked, null);

    assert.equal(
      await linkPatientProfileToUserByEmail(prisma, { email: emails.unlinked, userId }),
      "linked",
    );
    const after = await prisma.patientProfile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });
    assert.equal(after?.userId, userId);
  });

  it("matches the address case-insensitively and trims it", async () => {
    // Callers hand over whatever the CSV/session carried; every writer stores
    // the address lowercased, so normalising here is what makes them meet.
    const userId = await mkUser(`${uniq}-case@example.test`);
    const profileId = await mkProfile(`${uniq}-case@example.test`, null);

    const outcome = await linkPatientProfileToUserByEmail(prisma, {
      email: `  ${uniq}-CASE@Example.Test  `,
      userId,
    });
    assert.equal(outcome, "linked");
    const row = await prisma.patientProfile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });
    assert.equal(row?.userId, userId);
  });

  it("never re-points a chart that already belongs to somebody else", async () => {
    const ownerId = await mkUser(emails.taken);
    const profileId = await mkProfile(emails.taken, ownerId);
    const intruderId = await mkUser(`${uniq}-intruder@example.test`);

    assert.equal(
      await linkPatientProfileToUserByEmail(prisma, { email: emails.taken, userId: intruderId }),
      "owned-by-another-account",
    );
    const row = await prisma.patientProfile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });
    assert.equal(row?.userId, ownerId, "the owning account must keep its chart");
  });

  it("reports, rather than crashes, when the account already holds another chart", async () => {
    // PatientProfile.userId is unique, so linking a second chart to the same
    // account is a P2002 — and two charts for one person is a merge decision
    // for a human. The caller gets a countable reason instead of a dead batch.
    const userId = await mkUser(`${uniq}-two-charts@example.test`);
    await mkProfile(`${uniq}-two-charts@example.test`, userId);
    const strayId = await mkProfile(emails.otherChart, null);

    assert.equal(
      await linkPatientProfileToUserByEmail(prisma, { email: emails.otherChart, userId }),
      "account-holds-another-chart",
    );
    const row = await prisma.patientProfile.findUnique({
      where: { id: strayId },
      select: { userId: true },
    });
    assert.equal(row?.userId, null);
  });

  it("reports already-linked and no-chart without writing", async () => {
    const userId = await mkUser(`${uniq}-idem@example.test`);
    await mkProfile(`${uniq}-idem@example.test`, userId);

    assert.equal(
      await linkPatientProfileToUserByEmail(prisma, { email: `${uniq}-idem@example.test`, userId }),
      "already-linked",
    );
    assert.equal(
      await linkPatientProfileToUserByEmail(prisma, { email: `${uniq}-nobody@example.test`, userId }),
      "no-chart",
    );
  });
});

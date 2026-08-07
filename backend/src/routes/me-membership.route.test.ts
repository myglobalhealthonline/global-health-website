import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs } from "../test-utils/audit-cleanup.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * Member-facing membership routes — integration (§16.2, phase 3).
 *
 * The claim is the whole reason this file is long. It is the one member-facing
 * path that can move an enrollment between accounts, so the tests pin the
 * properties that make it safe rather than just the happy path:
 *
 *   - a hit and a miss are indistinguishable from outside;
 *   - the confirmation link goes to the ENROLLED address, never the caller's;
 *   - a link is useless to any session but the one that asked for it;
 *   - expired, reused and non-PENDING rows are all refused identically;
 *   - every attempt, including misses, leaves an audit row.
 *
 * Skips when buildApp can't reach Postgres, matching the other route suites.
 */
describe("member membership routes", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];

  const uniq = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let currencyId = "";
  let countryId = "";
  let planId = "";
  let levelId = "";
  let familyLevelId = "";
  let adminId = "";
  const userIds: string[] = [];

  /** Every email the app tried to send, newest last. */
  let sent: { to: string; subject: string; text?: string; html?: string }[] = [];

  const cookieFor = (id: string, email: string, role: "PATIENT" | "ADMIN" = "PATIENT") => ({
    gh_auth: signAuthToken({ sub: id, role, email }),
  });

  async function mkUser(label: string, opts: { verified: boolean; role?: "PATIENT" | "ADMIN" }) {
    const user = await prisma.user.create({
      data: {
        email: `${label}-${uniq}@test.local`,
        passwordHash: "x",
        fullName: `Member ${label}`,
        role: opts.role ?? "PATIENT",
        emailVerifiedAt: opts.verified ? new Date() : null,
      },
    });
    userIds.push(user.id);
    return user;
  }

  async function mkEnrollment(overrides: Record<string, unknown> = {}) {
    return prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId,
        countryId,
        membershipId: `MEM-${Math.random().toString(36).slice(2, 9).toUpperCase()}`,
        email: `enrolled-${Math.random().toString(36).slice(2, 8)}-${uniq}@test.local`,
        firstName: "Ada",
        lastName: "Member",
        startDate: new Date("2026-01-01"),
        status: "PENDING",
        ...overrides,
      },
    });
  }

  /** Pull the raw token out of the confirmation mail we just captured. */
  function tokenFromLastMail(): string {
    const last = sent.at(-1);
    assert.ok(last, "expected a confirmation email");
    const match = /claim\/confirm\?token=([A-Za-z0-9_%-]+)/.exec(`${last.text}${last.html}`);
    assert.ok(match, `no token in mail: ${last.text}`);
    return decodeURIComponent(match[1]);
  }

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      app = await buildApp();
    } catch {
      return; // app null → skip all
    }
    (await import("../lib/email/send-email.js")).setEmailCaptureHook((input) => {
      sent.push(input as { to: string; subject: string; text?: string; html?: string });
    });

    const currency = await prisma.currency.create({
      data: { code: `M${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: `m${uniq}`.slice(0, 8).toLowerCase(),
        name: `Member Test ${uniq}`,
        slug: `member-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/mlg-${uniq}`,
        teamPath: `/mtm-${uniq}`,
        generalConsultationPath: `/mgn-${uniq}`,
        specialistConsultationPath: `/msp-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryId = country.id;
    planId = (
      await prisma.membershipPlan.create({
        data: { primaryCountryId: countryId, countries: { create: { countryId } }, slug: `mem-plan-${uniq}`, name: "Member Plan" },
      })
    ).id;
    levelId = (
      await prisma.membershipLevel.create({
        data: { planId, slug: "standard", name: "Standard", isDefault: true },
      })
    ).id;
    familyLevelId = (
      await prisma.membershipLevel.create({
        data: {
          planId,
          slug: "family",
          name: "Family",
          familyEnabled: true,
          maxDependents: 1,
        },
      })
    ).id;
    adminId = (await mkUser("admin", { verified: true, role: "ADMIN" })).id;
  });

  after(async () => {
    if (!app) return;
    (await import("../lib/email/send-email.js")).setEmailCaptureHook(null);
    await deleteAuditLogs(prisma, { actorUserId: { in: userIds } });
    await prisma.membershipClaimToken.deleteMany({ where: { enrollment: { planId } } });
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  // ─── Ownership scoping (§10) ───────────────────────────────────────────────

  it("rejects an unauthenticated read → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/me/memberships" });
    assert.equal(res.statusCode, 401);
  });

  it("lists only the caller's own enrollments", async (t) => {
    if (!app) return t.skip();
    const mine = await mkUser("owner", { verified: true });
    const theirs = await mkUser("other", { verified: true });
    const own = await mkEnrollment({ userId: mine.id, status: "ACTIVE" });
    await mkEnrollment({ userId: theirs.id, status: "ACTIVE" });

    const res = await app.inject({
      method: "GET",
      url: "/api/me/memberships",
      cookies: cookieFor(mine.id, mine.email),
    });
    assert.equal(res.statusCode, 200);
    const rows = res.json().data as { id: string }[];
    assert.deepEqual(
      rows.map((r) => r.id),
      [own.id],
    );
  });

  it("404s another member's enrollment id — same answer as a nonexistent one", async (t) => {
    if (!app) return t.skip();
    const mine = await mkUser("prober", { verified: true });
    const theirs = await mkUser("victim", { verified: true });
    const notMine = await mkEnrollment({ userId: theirs.id, status: "ACTIVE" });

    const real = await app.inject({
      method: "GET",
      url: `/api/me/memberships/${notMine.id}`,
      cookies: cookieFor(mine.id, mine.email),
    });
    const fake = await app.inject({
      method: "GET",
      url: "/api/me/memberships/does-not-exist",
      cookies: cookieFor(mine.id, mine.email),
    });
    assert.equal(real.statusCode, 404);
    assert.equal(fake.statusCode, 404);
    assert.equal(real.body, fake.body);
  });

  it("reports a future startDate as NOT_STARTED while the row is ACTIVE (§5.2)", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("future", { verified: true });
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const row = await mkEnrollment({ userId: user.id, status: "ACTIVE", startDate: future });

    const res = await app.inject({
      method: "GET",
      url: `/api/me/memberships/${row.id}`,
      cookies: cookieFor(user.id, user.email),
    });
    assert.equal(res.statusCode, 200);
    const view = res.json().data as { status: string; termState: string };
    assert.equal(view.status, "ACTIVE");
    assert.equal(view.termState, "NOT_STARTED");
  });

  // ─── Claim, step 1 (§5.3) ──────────────────────────────────────────────────

  it("returns the same body for a matching claim and a miss", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("claimer", { verified: true });
    const enrollment = await mkEnrollment();

    const hit = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      cookies: cookieFor(user.id, user.email),
      payload: { membershipId: enrollment.membershipId, email: enrollment.email },
    });
    const miss = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      cookies: cookieFor(user.id, user.email),
      payload: { membershipId: "NO-SUCH-ID-0001", email: `nobody-${uniq}@test.local` },
    });

    assert.equal(hit.statusCode, 200);
    assert.equal(miss.statusCode, 200);
    assert.equal(hit.body, miss.body);
  });

  it("mails the confirmation link to the enrolled address, not the requester's", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("requester", { verified: true });
    const enrollment = await mkEnrollment();
    sent = [];

    await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      cookies: cookieFor(user.id, user.email),
      payload: { membershipId: enrollment.membershipId, email: enrollment.email },
    });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, enrollment.email);
    assert.notEqual(sent[0].to, user.email);
    // The requester is named in the body so an unexpected claim is spottable.
    assert.ok(`${sent[0].text}`.includes(user.email));
  });

  it("stores only the token hash, never the raw token", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("hash", { verified: true });
    const enrollment = await mkEnrollment();
    sent = [];
    await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      cookies: cookieFor(user.id, user.email),
      payload: { membershipId: enrollment.membershipId, email: enrollment.email },
    });
    const raw = tokenFromLastMail();
    const stored = await prisma.membershipClaimToken.findFirst({
      where: { enrollmentId: enrollment.id },
      select: { tokenHash: true },
    });
    assert.ok(stored);
    assert.notEqual(stored.tokenHash, raw);
    assert.match(stored.tokenHash, /^[a-f0-9]{64}$/);
  });

  it("refuses an unverified requester without touching any enrollment", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("unverified", { verified: false });
    const enrollment = await mkEnrollment();
    sent = [];

    const res = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      cookies: cookieFor(user.id, user.email),
      payload: { membershipId: enrollment.membershipId, email: enrollment.email },
    });
    assert.equal(res.statusCode, 403);
    assert.equal(sent.length, 0);
    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.userId, null);
  });

  for (const status of ["SUSPENDED", "EXPIRED", "REMOVED", "ACTIVE"] as const) {
    it(`never mails a link for a ${status} enrollment`, async (t) => {
      if (!app) return t.skip();
      const user = await mkUser(`claim-${status.toLowerCase()}`, { verified: true });
      const enrollment = await mkEnrollment({ status });
      sent = [];

      const res = await app.inject({
        method: "POST",
        url: "/api/me/memberships/claim",
        cookies: cookieFor(user.id, user.email),
        payload: { membershipId: enrollment.membershipId, email: enrollment.email },
      });
      assert.equal(res.statusCode, 200); // still the generic answer
      assert.equal(sent.length, 0);
    });
  }

  it("writes an audit row for a MISSED attempt, keyed by the probed id", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("audited", { verified: true });
    const probed = "PROBE-0042";

    await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      cookies: cookieFor(user.id, user.email),
      payload: { membershipId: probed, email: `ghost-${uniq}@test.local` },
    });

    const row = await prisma.auditLog.findFirst({
      where: { actorUserId: user.id, action: "MEMBERSHIP_CLAIM_REQUESTED" },
      select: { entityType: true, entityId: true, metadata: true },
    });
    assert.ok(row);
    assert.equal(row.entityType, "MembershipClaimAttempt");
    assert.equal(row.entityId, probed.toLowerCase());
    assert.equal((row.metadata as { matched?: boolean } | null)?.matched, false);
  });

  it("matches membership id and email case-insensitively", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("casing", { verified: true });
    const enrollment = await mkEnrollment();
    sent = [];

    await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      cookies: cookieFor(user.id, user.email),
      payload: {
        membershipId: enrollment.membershipId.toLowerCase(),
        email: enrollment.email.toUpperCase(),
      },
    });
    assert.equal(sent.length, 1);
  });

  // ─── Claim, step 2 ─────────────────────────────────────────────────────────

  async function requestClaim(user: { id: string; email: string }) {
    const enrollment = await mkEnrollment();
    sent = [];
    await app!.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      cookies: cookieFor(user.id, user.email),
      payload: { membershipId: enrollment.membershipId, email: enrollment.email },
    });
    return { enrollment, token: tokenFromLastMail() };
  }

  it("attaches the enrollment when the requester confirms", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("confirm", { verified: true });
    const { enrollment, token } = await requestClaim(user);

    const res = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim/confirm",
      cookies: cookieFor(user.id, user.email),
      payload: { token },
    });
    assert.equal(res.statusCode, 200, res.body);

    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.userId, user.id);
    assert.equal(after?.status, "ACTIVE");
    assert.ok(after?.claimedAt);
    assert.ok(after?.linkedAt);
  });

  it("links a past endDate as EXPIRED, not ACTIVE (§5.2)", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("expired-term", { verified: true });
    // Both dates in the past — a CHECK constraint enforces endDate > startDate,
    // so a past endDate under the default 2026 start would be rejected by the
    // database before the claim path ever ran.
    const enrollment = await mkEnrollment({
      startDate: new Date("2019-01-01"),
      endDate: new Date("2020-01-01"),
    });
    sent = [];
    await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      cookies: cookieFor(user.id, user.email),
      payload: { membershipId: enrollment.membershipId, email: enrollment.email },
    });
    await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim/confirm",
      cookies: cookieFor(user.id, user.email),
      payload: { token: tokenFromLastMail() },
    });

    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.status, "EXPIRED");
    assert.equal(after?.userId, user.id);
  });

  it("refuses a token opened by a different session", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("owner-token", { verified: true });
    const attacker = await mkUser("thief", { verified: true });
    const { enrollment, token } = await requestClaim(user);

    const res = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim/confirm",
      cookies: cookieFor(attacker.id, attacker.email),
      payload: { token },
    });
    assert.equal(res.statusCode, 400);
    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.userId, null);
  });

  it("refuses a reused token — single use", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("reuse", { verified: true });
    const { token } = await requestClaim(user);

    const first = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim/confirm",
      cookies: cookieFor(user.id, user.email),
      payload: { token },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim/confirm",
      cookies: cookieFor(user.id, user.email),
      payload: { token },
    });
    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 400);
  });

  it("refuses an expired token", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("stale", { verified: true });
    const { enrollment, token } = await requestClaim(user);
    await prisma.membershipClaimToken.updateMany({
      where: { enrollmentId: enrollment.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim/confirm",
      cookies: cookieFor(user.id, user.email),
      payload: { token },
    });
    assert.equal(res.statusCode, 400);
    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.userId, null);
  });

  it("refuses when the enrollment stopped being claimable in the meantime", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("suspended-mid", { verified: true });
    const { enrollment, token } = await requestClaim(user);
    await prisma.membershipEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "SUSPENDED" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim/confirm",
      cookies: cookieFor(user.id, user.email),
      payload: { token },
    });
    assert.equal(res.statusCode, 400);
    const after = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(after?.userId, null);
    assert.equal(after?.status, "SUSPENDED");
  });

  it("answers every rejection with the identical message", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("uniform", { verified: true });
    const cookies = cookieFor(user.id, user.email);
    const garbage = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim/confirm",
      cookies,
      payload: { token: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    });
    const { enrollment, token } = await requestClaim(user);
    await prisma.membershipClaimToken.updateMany({
      where: { enrollmentId: enrollment.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim/confirm",
      cookies,
      payload: { token },
    });
    assert.equal(garbage.body, expired.body);
  });

  // ─── Member-added dependents (§10) ─────────────────────────────────────────

  it("adds a dependent up to the level cap, then refuses", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("family", { verified: true });
    const primary = await mkEnrollment({
      userId: user.id,
      status: "ACTIVE",
      levelId: familyLevelId,
    });
    const cookies = cookieFor(user.id, user.email);
    const body = (n: number) => ({
      email: `dep${n}-${uniq}@test.local`,
      firstName: "Dee",
      lastName: "Pendent",
      relationship: "child",
    });

    const first = await app.inject({
      method: "POST",
      url: `/api/me/memberships/${primary.id}/dependents`,
      cookies,
      payload: body(1),
    });
    const second = await app.inject({
      method: "POST",
      url: `/api/me/memberships/${primary.id}/dependents`,
      cookies,
      payload: body(2),
    });
    assert.equal(first.statusCode, 201, first.body);
    assert.equal(second.statusCode, 400);
  });

  it("refuses to add a dependent to someone else's membership → 404", async (t) => {
    if (!app) return t.skip();
    const mine = await mkUser("dep-prober", { verified: true });
    const theirs = await mkUser("dep-victim", { verified: true });
    const notMine = await mkEnrollment({
      userId: theirs.id,
      status: "ACTIVE",
      levelId: familyLevelId,
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/me/memberships/${notMine.id}/dependents`,
      cookies: cookieFor(mine.id, mine.email),
      payload: {
        email: `intruder-${uniq}@test.local`,
        firstName: "In",
        lastName: "Truder",
      },
    });
    assert.equal(res.statusCode, 404);
  });

  it("removes a member-added dependent but not an admin-added one", async (t) => {
    if (!app) return t.skip();
    const user = await mkUser("dep-remove", { verified: true });
    const cookies = cookieFor(user.id, user.email);
    const primary = await mkEnrollment({
      userId: user.id,
      status: "ACTIVE",
      levelId: familyLevelId,
    });
    const created = await app.inject({
      method: "POST",
      url: `/api/me/memberships/${primary.id}/dependents`,
      cookies,
      payload: { email: `mine-${uniq}@test.local`, firstName: "My", lastName: "Dep" },
    });
    assert.equal(created.statusCode, 201, created.body);
    const memberAddedId = created.json().data.id as string;

    // Same shape, but stamped with an admin actor — out of the member's reach.
    const adminAdded = await mkEnrollment({
      levelId: familyLevelId,
      memberType: "DEPENDENT",
      primaryEnrollmentId: primary.id,
      createdByAdminId: adminId,
    });

    const ok = await app.inject({
      method: "DELETE",
      url: `/api/me/memberships/dependents/${memberAddedId}`,
      cookies,
    });
    const refused = await app.inject({
      method: "DELETE",
      url: `/api/me/memberships/dependents/${adminAdded.id}`,
      cookies,
    });
    assert.equal(ok.statusCode, 200, ok.body);
    assert.equal(refused.statusCode, 404);
    assert.equal(
      (await prisma.membershipEnrollment.findUnique({ where: { id: adminAdded.id } }))?.status,
      "PENDING",
    );
  });

  // ─── Rate limiting (§5.3) ──────────────────────────────────────────────────
  //
  // Last, because the buckets persist for the app instance's lifetime.

  it("buckets the claim per user: one account's 429 does not block another", async (t) => {
    if (!app) return t.skip();
    const noisy = await mkUser("noisy", { verified: true });
    const quiet = await mkUser("quiet", { verified: true });
    const payload = { membershipId: "RL-TEST-0001", email: `rl-${uniq}@test.local` };

    let noisyStatus = 0;
    for (let i = 0; i < 6; i += 1) {
      const res = await app.inject({
        method: "POST",
        url: "/api/me/memberships/claim",
        cookies: cookieFor(noisy.id, noisy.email),
        payload,
      });
      noisyStatus = res.statusCode;
    }
    assert.equal(noisyStatus, 429, "6th attempt from one account should be limited");

    const other = await app.inject({
      method: "POST",
      url: "/api/me/memberships/claim",
      cookies: cookieFor(quiet.id, quiet.email),
      payload,
    });
    assert.equal(other.statusCode, 200, "a different account keeps its own budget");
  });

  it("falls back to an IP bucket when there is no valid cookie", async (t) => {
    if (!app) return t.skip();
    // Rate limiting runs on onRequest, before requireAuth's preHandler, so an
    // unauthenticated flood is bounded before it is rejected: the first few
    // answer 401, and the bucket takes over.
    const seen = new Set<number>();
    for (let i = 0; i < 7; i += 1) {
      const res = await app.inject({
        method: "POST",
        url: "/api/me/memberships/claim",
        payload: { membershipId: "RL-ANON-0001", email: `anon-${uniq}@test.local` },
      });
      seen.add(res.statusCode);
    }
    assert.ok(seen.has(401), "unauthenticated attempts are rejected");
    assert.ok(seen.has(429), "and are still bounded by the IP bucket");
  });
});

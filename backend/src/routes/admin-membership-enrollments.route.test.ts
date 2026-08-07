import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { deleteAuditLogs } from "../test-utils/audit-cleanup.js";

loadEnv({ path: join(__dirname, "../..", ".env") });

/**
 * Membership enrollments — admin route integration (§16.2, phase 2).
 *
 * Covers the authorization matrix (MANAGE_MEMBERSHIPS, LOCAL_ADMIN denied), the
 * lifecycle transitions and their effect on dependents, the family cap, and the
 * invariants that only a database can prove: global case-insensitive membership
 * ids, one live enrollment per (plan, email), and revive-on-re-add.
 *
 * Skips when buildApp can't reach Postgres, matching admin-membership-plans.
 */
describe("admin membership enrollment routes", () => {
  let app: FastifyInstance | null = null;
  let prisma: PrismaClient;
  let signAuthToken: typeof import("../utils/auth-session.js")["signAuthToken"];

  const uniq = `enr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let currencyId = "";
  let countryId = "";
  let planId = "";
  let defaultLevelId = "";
  let familyLevelId = "";
  let adminId = "";
  let localAdminId = "";
  let patientId = "";
  let adminCookie: Record<string, string> = {};
  let localAdminCookie: Record<string, string> = {};
  let patientCookie: Record<string, string> = {};
  const extraUserIds: string[] = [];

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      app = await buildApp();
    } catch {
      return; // app null → skip all
    }
    (await import("../lib/email/send-email.js")).setEmailCaptureHook(() => {});

    const currency = await prisma.currency.create({
      data: { code: `E${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: `e${uniq}`.slice(0, 8).toLowerCase(),
        name: `Enrollment Test ${uniq}`,
        slug: `enrollment-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/elg-${uniq}`,
        teamPath: `/etm-${uniq}`,
        generalConsultationPath: `/egn-${uniq}`,
        specialistConsultationPath: `/esp-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryId = country.id;
    const plan = await prisma.membershipPlan.create({
      data: { primaryCountryId: countryId, countries: { create: { countryId } }, slug: `enr-plan-${uniq}`, name: "Enrollment Plan" },
    });
    planId = plan.id;
    defaultLevelId = (
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

    const mkUser = (label: string, role: "ADMIN" | "LOCAL_ADMIN" | "PATIENT") =>
      prisma.user.create({
        data: {
          email: `${label}-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `Enrollment ${label}`,
          role,
        },
      });
    const admin = await mkUser("admin", "ADMIN");
    const localAdmin = await mkUser("local", "LOCAL_ADMIN");
    const patient = await mkUser("patient", "PATIENT");
    adminId = admin.id;
    localAdminId = localAdmin.id;
    patientId = patient.id;
    adminCookie = {
      gh_auth: signAuthToken({ sub: admin.id, role: "ADMIN", email: admin.email }),
    };
    localAdminCookie = {
      gh_auth: signAuthToken({ sub: localAdmin.id, role: "LOCAL_ADMIN", email: localAdmin.email }),
    };
    patientCookie = {
      gh_auth: signAuthToken({ sub: patient.id, role: "PATIENT", email: patient.email }),
    };
  });

  after(async () => {
    if (!app) return;
    (await import("../lib/email/send-email.js")).setEmailCaptureHook(null);
    await deleteAuditLogs(prisma, { actorUserId: { in: [adminId, localAdminId, patientId] } });
    await prisma.membershipInviteLog.deleteMany({ where: { enrollment: { planId } } });
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.user.deleteMany({
      where: { id: { in: [adminId, localAdminId, patientId, ...extraUserIds] } },
    });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app.close();
  });

  const enrollPayload = (suffix: string, overrides: Record<string, unknown> = {}) => ({
    planId,
    membershipId: `ENR-${suffix}`,
    email: `member-${suffix}-${uniq}@test.local`,
    firstName: "Ada",
    lastName: "Member",
    startDate: "2026-01-01",
    ...overrides,
  });

  async function enroll(suffix: string, overrides: Record<string, unknown> = {}) {
    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/membership-enrollments",
      cookies: adminCookie,
      payload: enrollPayload(suffix, overrides),
    });
    assert.equal(res.statusCode, 200, res.body);
    return res.json().data.enrollment as { id: string; status: string; membershipId: string };
  }

  // ─── Authorization (§4.2) ──────────────────────────────────────────────────

  it("rejects an unauthenticated read → 401", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({ method: "GET", url: "/api/admin/membership-enrollments" });
    assert.equal(res.statusCode, 401);
  });

  it("rejects a patient session → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-enrollments",
      cookies: patientCookie,
    });
    assert.equal(res.statusCode, 403);
  });

  it("rejects LOCAL_ADMIN — a plan's member list is whole-market PII → 403", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-enrollments",
      cookies: localAdminCookie,
    });
    assert.equal(res.statusCode, 403);
  });

  it("denies LOCAL_ADMIN the write too, and writes nothing", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-enrollments",
      cookies: localAdminCookie,
      payload: enrollPayload("denied"),
    });
    assert.equal(res.statusCode, 403, res.body);
    const leaked = await prisma.membershipEnrollment.findFirst({
      where: { membershipId: "ENR-denied" },
    });
    assert.equal(leaked, null);
  });

  // ─── Create ────────────────────────────────────────────────────────────────

  it("enrolls a member as PENDING on the plan's default level, and audits it", async (t) => {
    if (!app) return t.skip();
    const enrollment = await enroll("a1");
    assert.equal(enrollment.status, "PENDING");

    const row = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(row?.levelId, defaultLevelId);
    assert.equal(row?.countryId, countryId, "countryId is stamped from the plan");
    assert.equal(row?.email, `member-a1-${uniq}@test.local`.toLowerCase());

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "MembershipEnrollment", entityId: enrollment.id },
    });
    assert.ok(audit, "the create is audited");
  });

  it("activates immediately when the address already belongs to a VERIFIED account", async (t) => {
    if (!app) return t.skip();
    const email = `verified-${uniq}@test.local`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "x",
        fullName: "Verified Member",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    extraUserIds.push(user.id);

    const enrollment = await enroll("v1", { email });
    assert.equal(enrollment.status, "ACTIVE");
    const row = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(row?.userId, user.id);
  });

  it("leaves an UNVERIFIED account PENDING — an email match is not proof (§5.2)", async (t) => {
    if (!app) return t.skip();
    const email = `unverified-${uniq}@test.local`;
    const user = await prisma.user.create({
      data: { email, passwordHash: "x", fullName: "Unverified", role: "PATIENT" },
    });
    extraUserIds.push(user.id);

    const enrollment = await enroll("u1", { email });
    assert.equal(enrollment.status, "PENDING");
    const row = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(row?.userId, null);
  });

  it("refuses a membership id that differs only in case → 400", async (t) => {
    if (!app) return t.skip();
    await enroll("case1");
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-enrollments",
      cookies: adminCookie,
      payload: enrollPayload("other", { membershipId: "enr-case1" }),
    });
    assert.equal(res.statusCode, 400, res.body);
    assert.match(res.json().message, /already in use/i);
  });

  it("refuses a second live enrollment for the same email in the same plan → 400", async (t) => {
    if (!app) return t.skip();
    const first = await enroll("dupe");
    const email = (await prisma.membershipEnrollment.findUnique({ where: { id: first.id } }))!.email;
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-enrollments",
      cookies: adminCookie,
      payload: enrollPayload("dupe2", { email: email.toUpperCase() }),
    });
    assert.equal(res.statusCode, 400, res.body);
    assert.match(res.json().message, /already enrolled/i);
  });

  it("rejects a level from another plan → 400", async (t) => {
    if (!app) return t.skip();
    const otherPlan = await prisma.membershipPlan.create({
      data: { primaryCountryId: countryId, countries: { create: { countryId } }, slug: `other-plan-${uniq}`, name: "Other Plan" },
    });
    const otherLevel = await prisma.membershipLevel.create({
      data: {
        planId: otherPlan.id,
        slug: "standard",
        name: "Standard",
        isDefault: true,
      },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/membership-enrollments",
      cookies: adminCookie,
      payload: enrollPayload("foreign", { levelId: otherLevel.id }),
    });
    assert.equal(res.statusCode, 400, res.body);
    await prisma.membershipPlan.deleteMany({ where: { id: otherPlan.id } });
  });

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  it("suspends, then reactivates back to PENDING while unlinked", async (t) => {
    if (!app) return t.skip();
    const enrollment = await enroll("life1");

    const suspended = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${enrollment.id}/suspend`,
      cookies: adminCookie,
      payload: { reason: "Partner paused the account" },
    });
    assert.equal(suspended.statusCode, 200, suspended.body);
    assert.equal(suspended.json().data.enrollment.status, "SUSPENDED");

    const reactivated = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${enrollment.id}/reactivate`,
      cookies: adminCookie,
    });
    assert.equal(reactivated.statusCode, 200, reactivated.body);
    // Not ACTIVE: it never linked, so it goes back to where it was.
    assert.equal(reactivated.json().data.enrollment.status, "PENDING");
  });

  it("reactivates a lapsed term as EXPIRED, not ACTIVE", async (t) => {
    if (!app) return t.skip();
    const enrollment = await enroll("life2", { endDate: "2021-01-01", startDate: "2020-01-01" });
    const user = await prisma.user.create({
      data: {
        email: `lapsed-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Lapsed",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    extraUserIds.push(user.id);
    await prisma.membershipEnrollment.update({
      where: { id: enrollment.id },
      data: { userId: user.id, status: "SUSPENDED" },
    });

    const res = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${enrollment.id}/reactivate`,
      cookies: adminCookie,
    });
    assert.equal(res.json().data.enrollment.status, "EXPIRED");
  });

  it("refuses to reactivate something that was never suspended → 400", async (t) => {
    if (!app) return t.skip();
    const enrollment = await enroll("life3");
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${enrollment.id}/reactivate`,
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it("removes softly, and re-adding the same email revives that row with the new id", async (t) => {
    if (!app) return t.skip();
    const enrollment = await enroll("revive1");
    const email = (await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } }))!
      .email;

    const removed = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${enrollment.id}/remove`,
      cookies: adminCookie,
    });
    assert.equal(removed.json().data.enrollment.status, "REMOVED");

    const readded = await app.inject({
      method: "POST",
      url: "/api/admin/membership-enrollments",
      cookies: adminCookie,
      payload: enrollPayload("revive2", { email, membershipId: "ENR-revive-new" }),
    });
    assert.equal(readded.statusCode, 200, readded.body);
    const revived = readded.json().data.enrollment;
    assert.equal(revived.id, enrollment.id, "the removed row is revived, not duplicated");
    assert.equal(revived.membershipId, "ENR-revive-new");
    assert.equal(revived.status, "PENDING");
  });

  // ─── Dependents (§11) ──────────────────────────────────────────────────────

  it("adds a dependent that inherits level and term, with a derived membership id", async (t) => {
    if (!app) return t.skip();
    const primary = await enroll("fam1", { levelId: familyLevelId, endDate: "2027-01-01" });
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${primary.id}/dependents`,
      cookies: adminCookie,
      payload: {
        email: `child-${uniq}@test.local`,
        firstName: "Kid",
        lastName: "Member",
        relationship: "child",
      },
    });
    assert.equal(res.statusCode, 200, res.body);
    const dependent = res.json().data.enrollment;
    assert.equal(dependent.memberType, "DEPENDENT");
    assert.equal(dependent.membershipId, "ENR-fam1-D1");
    assert.equal(dependent.levelId, familyLevelId);
    assert.equal(
      new Date(dependent.endDate).toISOString(),
      new Date("2027-01-01").toISOString(),
      "the term is inherited, not supplied",
    );
  });

  it("refuses a dependent over the level's cap, and on a level without family cover", async (t) => {
    if (!app) return t.skip();
    const primary = await enroll("fam2", { levelId: familyLevelId });
    const first = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${primary.id}/dependents`,
      cookies: adminCookie,
      payload: { email: `kid1-${uniq}@test.local`, firstName: "One", lastName: "Kid" },
    });
    assert.equal(first.statusCode, 200, first.body);

    const second = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${primary.id}/dependents`,
      cookies: adminCookie,
      payload: { email: `kid2-${uniq}@test.local`, firstName: "Two", lastName: "Kid" },
    });
    assert.equal(second.statusCode, 400, second.body);
    assert.match(second.json().message, /at most 1 dependent/i);

    const solo = await enroll("solo1");
    const noFamily = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${solo.id}/dependents`,
      cookies: adminCookie,
      payload: { email: `kid3-${uniq}@test.local`, firstName: "Three", lastName: "Kid" },
    });
    assert.equal(noFamily.statusCode, 400, noFamily.body);
    assert.match(noFamily.json().message, /family cover/i);
  });

  it("carries suspend and remove down to the dependents", async (t) => {
    if (!app) return t.skip();
    const primary = await enroll("fam3", { levelId: familyLevelId });
    const dependentRes = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${primary.id}/dependents`,
      cookies: adminCookie,
      payload: { email: `kid4-${uniq}@test.local`, firstName: "Four", lastName: "Kid" },
    });
    const dependentId = dependentRes.json().data.enrollment.id as string;

    await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${primary.id}/suspend`,
      cookies: adminCookie,
      payload: {},
    });
    assert.equal(
      (await prisma.membershipEnrollment.findUnique({ where: { id: dependentId } }))?.status,
      "SUSPENDED",
    );

    await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${primary.id}/reactivate`,
      cookies: adminCookie,
    });
    assert.equal(
      (await prisma.membershipEnrollment.findUnique({ where: { id: dependentId } }))?.status,
      "PENDING",
    );

    await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${primary.id}/remove`,
      cookies: adminCookie,
    });
    assert.equal(
      (await prisma.membershipEnrollment.findUnique({ where: { id: dependentId } }))?.status,
      "REMOVED",
    );
  });

  it("refuses to give a dependent its own level or term → 400", async (t) => {
    if (!app) return t.skip();
    const primary = await enroll("fam4", { levelId: familyLevelId });
    const dependentRes = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${primary.id}/dependents`,
      cookies: adminCookie,
      payload: { email: `kid5-${uniq}@test.local`, firstName: "Five", lastName: "Kid" },
    });
    const dependentId = dependentRes.json().data.enrollment.id as string;

    const res = await app.inject({
      method: "PATCH",
      url: `/api/admin/membership-enrollments/${dependentId}`,
      cookies: adminCookie,
      payload: { startDate: "2030-01-01" },
    });
    assert.equal(res.statusCode, 400, res.body);
    assert.match(res.json().message, /inherits/i);
  });

  // ─── Update, term propagation and invite ───────────────────────────────────

  it("pushes a changed term down to the dependents", async (t) => {
    if (!app) return t.skip();
    const primary = await enroll("term1", { levelId: familyLevelId });
    const dependentRes = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${primary.id}/dependents`,
      cookies: adminCookie,
      payload: { email: `kid6-${uniq}@test.local`, firstName: "Six", lastName: "Kid" },
    });
    const dependentId = dependentRes.json().data.enrollment.id as string;

    const res = await app.inject({
      method: "PATCH",
      url: `/api/admin/membership-enrollments/${primary.id}`,
      cookies: adminCookie,
      payload: { endDate: "2028-06-30" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const dependent = await prisma.membershipEnrollment.findUnique({ where: { id: dependentId } });
    assert.equal(dependent?.endDate?.toISOString().slice(0, 10), "2028-06-30");
  });

  it("unlinks the account when the email changes — the old proof no longer applies", async (t) => {
    if (!app) return t.skip();
    const email = `switch-${uniq}@test.local`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: "x",
        fullName: "Switcher",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    extraUserIds.push(user.id);
    const enrollment = await enroll("switch1", { email });
    assert.equal(enrollment.status, "ACTIVE");

    const res = await app.inject({
      method: "PATCH",
      url: `/api/admin/membership-enrollments/${enrollment.id}`,
      cookies: adminCookie,
      payload: { email: `switched-${uniq}@test.local` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const row = await prisma.membershipEnrollment.findUnique({ where: { id: enrollment.id } });
    assert.equal(row?.userId, null);
    assert.equal(row?.status, "PENDING");
  });

  it("logs an invite attempt either way", async (t) => {
    if (!app) return t.skip();
    const enrollment = await enroll("invite1");
    const res = await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${enrollment.id}/invite`,
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const log = await prisma.membershipInviteLog.findFirst({
      where: { enrollmentId: enrollment.id },
    });
    assert.ok(log, "the attempt is recorded in MembershipInviteLog");
  });

  it("filters the list by status and free-text search", async (t) => {
    if (!app) return t.skip();
    const enrollment = await enroll("search1", { firstName: "Zenobia" });
    await app.inject({
      method: "POST",
      url: `/api/admin/membership-enrollments/${enrollment.id}/suspend`,
      cookies: adminCookie,
      payload: {},
    });

    const byStatus = await app.inject({
      method: "GET",
      url: `/api/admin/membership-enrollments?planId=${planId}&status=SUSPENDED`,
      cookies: adminCookie,
    });
    const suspended = byStatus.json().data.items as { id: string }[];
    assert.ok(suspended.some((r) => r.id === enrollment.id));

    const byQuery = await app.inject({
      method: "GET",
      url: `/api/admin/membership-enrollments?planId=${planId}&q=zenobia`,
      cookies: adminCookie,
    });
    const found = byQuery.json().data.items as { id: string }[];
    assert.equal(found.length, 1);
    assert.equal(found[0].id, enrollment.id);
  });

  it("404s an unknown enrollment", async (t) => {
    if (!app) return t.skip();
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/membership-enrollments/does-not-exist",
      cookies: adminCookie,
    });
    assert.equal(res.statusCode, 404);
  });
});

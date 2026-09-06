import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { deleteAuditLogs } from "../test-utils/audit-cleanup.js";

/**
 * The deletion workflow's own country scope — the same class of bug AZ-1 fixed
 * on `/api/admin/appointments*` and AZ-2 on `/api/admin/patient-merge*`.
 *
 * All three endpoints here gated only on `verifyAdminAccess`, which treats
 * LOCAL_ADMIN exactly like ADMIN. A LOCAL_ADMIN scoped to one country could
 * list every other country's deletion requests, advance them, and — through
 * `POST /api/admin/patient-anonymize` — irreversibly erase a patient they
 * administer nothing for.
 *
 * The fix must move only LOCAL_ADMIN. ADMIN and SUPER_ADMIN stay unscoped, and
 * the maintenance-token path (no session at all) is unchanged.
 *
 * Deliberately NOT loading backend/.env: this suite runs against the isolated
 * local test cluster and must never pull production configuration in.
 *
 * Cases share one set of fixtures and MUST run sequentially in declaration
 * order (node:test's default) — the anonymization cases mutate the profiles the
 * earlier list cases count.
 */
describe("admin data-deletion — LOCAL_ADMIN country scope", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];
  let bootError: unknown = null;

  const uniq = `delscope-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ieFolder = `zi${Math.random().toString(36).slice(2, 8)}`.toLowerCase();
  const brFolder = `zb${Math.random().toString(36).slice(2, 8)}`.toLowerCase();

  let ieAdminId = "";
  let fullAdminId = "";
  let superAdminId = "";

  let ieProfileId = "";
  let brProfileId = "";
  let nullFolderProfileId = "";
  let ieRequestId = "";
  let brRequestId = "";
  let nullFolderRequestId = "";

  let ieAdminCookie: Record<string, string> = {};
  let fullAdminCookie: Record<string, string> = {};
  let superAdminCookie: Record<string, string> = {};

  const profileIds: string[] = [];
  const adminIds: string[] = [];

  async function makeProfile(label: string, folder: string | null): Promise<string> {
    const profile = await prisma.patientProfile.create({
      data: {
        email: `${label}-${uniq}@test.local`,
        fullName: `Patient ${label}`,
        countryFolderCode: folder,
      },
    });
    profileIds.push(profile.id);
    return profile.id;
  }

  async function makeRequest(patientProfileId: string): Promise<string> {
    const row = await prisma.dataDeletionRequest.create({
      data: { patientProfileId, requestStatus: "SUBMITTED" },
    });
    return row.id;
  }

  const listAs = (cookies: Record<string, string>) =>
    app!.inject({ method: "GET", url: "/api/admin/data-deletion-requests?limit=100", cookies });

  const patchAs = (
    id: string,
    cookies: Record<string, string>,
    body: Record<string, unknown> = { status: "UNDER_REVIEW" },
  ) =>
    app!.inject({
      method: "PATCH",
      url: `/api/admin/data-deletion-requests/${id}`,
      cookies,
      payload: body,
    });

  const anonymizeAs = (patientProfileId: string, cookies: Record<string, string>) =>
    app!.inject({
      method: "POST",
      url: "/api/admin/patient-anonymize",
      cookies,
      payload: { patientProfileId, reason: "synthetic country-scope regression test" },
    });

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      app = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }

    const mkAdmin = async (
      label: string,
      role: "LOCAL_ADMIN" | "ADMIN" | "SUPER_ADMIN",
      folders: string[],
    ) => {
      const user = await prisma.user.create({
        data: {
          email: `${label}-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `${label} ${uniq}`,
          role,
          allowedCountryFolders: folders,
        },
      });
      adminIds.push(user.id);
      return user;
    };

    const ieAdmin = await mkAdmin("ie-local-admin", "LOCAL_ADMIN", [ieFolder]);
    const fullAdmin = await mkAdmin("full-admin", "ADMIN", []);
    const superAdmin = await mkAdmin("super-admin", "SUPER_ADMIN", []);
    ieAdminId = ieAdmin.id;
    fullAdminId = fullAdmin.id;
    superAdminId = superAdmin.id;

    ieAdminCookie = {
      gh_auth: signAuthToken({ sub: ieAdminId, role: "LOCAL_ADMIN", email: ieAdmin.email }),
    };
    fullAdminCookie = {
      gh_auth: signAuthToken({ sub: fullAdminId, role: "ADMIN", email: fullAdmin.email }),
    };
    superAdminCookie = {
      gh_auth: signAuthToken({ sub: superAdminId, role: "SUPER_ADMIN", email: superAdmin.email }),
    };

    ieProfileId = await makeProfile("ie-patient", ieFolder);
    brProfileId = await makeProfile("br-patient", brFolder);
    nullFolderProfileId = await makeProfile("nofolder-patient", null);
    ieRequestId = await makeRequest(ieProfileId);
    brRequestId = await makeRequest(brProfileId);
    nullFolderRequestId = await makeRequest(nullFolderProfileId);
  });

  after(async () => {
    if (!app) return;
    for (const id of profileIds) await deleteAuditLogs(prisma, { entityId: id });
    await deleteAuditLogs(prisma, { actorUserId: { in: adminIds } });
    await prisma.dataDeletionRequest.deleteMany({
      where: { patientProfileId: { in: profileIds } },
    });
    // No Outbox cleanup: none of these fixtures carries an upload key, so the
    // anonymize calls here enqueue nothing. A kind+time-window delete would
    // have reached other suites' (and a worker's) genuine purge rows.
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.user.deleteMany({ where: { id: { in: adminIds } } });
    await app.close();
  });

  // ── LIST ─────────────────────────────────────────────────────────────────
  it("shows a LOCAL_ADMIN only their own country's requests", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await listAs(ieAdminCookie);
    assert.equal(res.statusCode, 200, res.body);
    const ids = (res.json().data.requests as { id: string }[]).map((r) => r.id);
    assert.ok(ids.includes(ieRequestId), "own-country request is visible");
    assert.equal(ids.includes(brRequestId), false, "foreign request never materialized");
    assert.equal(
      ids.includes(nullFolderRequestId),
      false,
      "a patient with no folder fails closed",
    );
    // The foreign patient's own id must not appear anywhere in the payload —
    // filtering the rendered list but leaving the row in the response would be
    // the same leak wearing a different shape.
    assert.equal(res.body.includes(brProfileId), false, "no foreign patient id in the body");
  });

  it("counts only in-scope rows in the pagination total", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const scoped = await listAs(ieAdminCookie);
    const unscoped = await listAs(fullAdminCookie);
    const scopedTotal = scoped.json().data.total as number;
    const scopedRows = (scoped.json().data.requests as unknown[]).length;
    assert.equal(
      scopedTotal,
      scopedRows,
      "total describes the same set the page shows, not every country's",
    );
    assert.ok(
      (unscoped.json().data.total as number) > scopedTotal,
      "an unscoped ADMIN sees strictly more",
    );
  });

  it("lets ADMIN and SUPER_ADMIN see every country", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    for (const cookie of [fullAdminCookie, superAdminCookie]) {
      const res = await listAs(cookie);
      assert.equal(res.statusCode, 200, res.body);
      const ids = (res.json().data.requests as { id: string }[]).map((r) => r.id);
      for (const id of [ieRequestId, brRequestId, nullFolderRequestId]) {
        assert.ok(ids.includes(id), `unscoped admin sees ${id}`);
      }
    }
  });

  // ── PATCH ────────────────────────────────────────────────────────────────
  it("refuses a LOCAL_ADMIN PATCH on a foreign request and mutates nothing", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const before = await prisma.dataDeletionRequest.findUnique({ where: { id: brRequestId } });
    const res = await patchAs(brRequestId, ieAdminCookie);
    assert.equal(res.statusCode, 403, res.body);
    const after = await prisma.dataDeletionRequest.findUnique({ where: { id: brRequestId } });
    assert.equal(after!.requestStatus, before!.requestStatus, "status unchanged");
    assert.equal(after!.reviewedByAdminId, null, "no reviewer stamped");
    const profile = await prisma.patientProfile.findUnique({ where: { id: brProfileId } });
    assert.equal(profile!.anonymizedAt, null, "patient untouched");
  });

  it("refuses a LOCAL_ADMIN PATCH on a null-folder patient", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await patchAs(nullFolderRequestId, ieAdminCookie);
    assert.equal(res.statusCode, 403, res.body);
  });

  it("keeps the denial audit free of the request body and patient identity", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    await patchAs(brRequestId, ieAdminCookie, {
      status: "REJECTED",
      adminNotes: "SYNTHETIC-NOTE-SHOULD-NOT-BE-AUDITED",
    });
    const rows = await prisma.auditLog.findMany({ where: { actorUserId: ieAdminId } });
    assert.ok(rows.length > 0, "the refusal is audited");
    const json = JSON.stringify(rows);
    assert.equal(json.includes("SYNTHETIC-NOTE-SHOULD-NOT-BE-AUDITED"), false, "no notes");
    const brProfile = await prisma.patientProfile.findUnique({ where: { id: brProfileId } });
    assert.equal(json.includes(brProfile!.email), false, "no patient email");
    assert.equal(json.includes(String(brProfile!.fullName)), false, "no patient name");
  });

  it("lets a LOCAL_ADMIN act on their own country", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await patchAs(ieRequestId, ieAdminCookie);
    assert.equal(res.statusCode, 200, res.body);
    const row = await prisma.dataDeletionRequest.findUnique({ where: { id: ieRequestId } });
    assert.equal(row!.requestStatus, "UNDER_REVIEW");
    assert.equal(row!.reviewedByAdminId, ieAdminId);
  });

  // ── DIRECT ANONYMIZE ─────────────────────────────────────────────────────
  it("refuses a LOCAL_ADMIN anonymizing a foreign patient, with zero mutations", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const before = await prisma.patientProfile.findUnique({ where: { id: brProfileId } });
    const res = await anonymizeAs(brProfileId, ieAdminCookie);
    assert.equal(res.statusCode, 403, res.body);
    const after = await prisma.patientProfile.findUnique({ where: { id: brProfileId } });
    assert.equal(after!.email, before!.email);
    assert.equal(after!.fullName, before!.fullName);
    assert.equal(after!.anonymizedAt, null);
    const audits = await prisma.auditLog.findMany({
      where: { entityId: brProfileId, action: "PATIENT_ANONYMIZED" },
    });
    assert.equal(audits.length, 0, "no completion record for work that did not happen");
  });

  it("refuses a LOCAL_ADMIN anonymizing a null-folder patient", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await anonymizeAs(nullFolderProfileId, ieAdminCookie);
    assert.equal(res.statusCode, 403, res.body);
    const after = await prisma.patientProfile.findUnique({
      where: { id: nullFolderProfileId },
    });
    assert.equal(after!.anonymizedAt, null);
  });

  it("fails closed when the folder changes under a passed precheck", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    // The route precheck and the erasure are separate reads. Simulating the
    // race directly: the service is called with the scope the route resolved,
    // and the profile has since moved to another country. The in-transaction
    // re-check must refuse rather than trust the earlier decision.
    const { anonymizePatient, PatientAnonymizeOutOfScopeError } = await import(
      "../modules/data-policy/country-data-policy.service.js"
    );
    const movedId = await makeProfile("moved-patient", ieFolder);
    await prisma.patientProfile.update({
      where: { id: movedId },
      data: { countryFolderCode: brFolder },
    });
    await assert.rejects(
      anonymizePatient({
        patientProfileId: movedId,
        adminId: ieAdminId,
        allowedCountryFolders: [ieFolder],
      }),
      (err: Error) => err instanceof PatientAnonymizeOutOfScopeError,
    );
    const after = await prisma.patientProfile.findUnique({ where: { id: movedId } });
    assert.equal(after!.anonymizedAt, null, "nothing erased");
  });

  it("lets ADMIN anonymize across countries", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const target = await makeProfile("admin-crosscountry", brFolder);
    const res = await anonymizeAs(target, fullAdminCookie);
    assert.equal(res.statusCode, 200, res.body);
    const after = await prisma.patientProfile.findUnique({ where: { id: target } });
    assert.ok(after!.anonymizedAt, "ADMIN keeps global reach");
  });

  it("lets SUPER_ADMIN anonymize across countries", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const target = await makeProfile("superadmin-crosscountry", brFolder);
    const res = await anonymizeAs(target, superAdminCookie);
    assert.equal(res.statusCode, 200, res.body);
    const after = await prisma.patientProfile.findUnique({ where: { id: target } });
    assert.ok(after!.anonymizedAt, "SUPER_ADMIN keeps global reach");
  });
});

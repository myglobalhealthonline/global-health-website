import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { deleteAuditLogs } from "../test-utils/audit-cleanup.js";

/**
 * AZ-2 regression: the three `/api/admin/patient-merge*` endpoints gated only
 * on `verifyAdminAccess`, which treats LOCAL_ADMIN exactly like ADMIN. A
 * LOCAL_ADMIN scoped to one country's folder could run the duplicate search
 * against any country's patient, read any patient's merge status, and — worst
 * of all — irreversibly merge two patients from a country they administer
 * nothing in. `/api/admin/appointments*` was fixed for this same class of bug
 * in AZ-1 (admin-appointments.local-admin-scope.test.ts); patient-merge was
 * missed, and it is the highest-impact of the three because a merge deactivates
 * an account and re-points every medical document, appointment and consent row.
 *
 * The fix must move only LOCAL_ADMIN. ADMIN and SUPER_ADMIN stay unscoped.
 *
 * Deliberately NOT loading backend/.env: this suite runs against the isolated
 * local test cluster and must never pull production configuration in.
 *
 * These cases share one set of patient fixtures and MUST run sequentially in
 * declaration order (node:test's default). The merge cases assert on
 * `isMerged` / `PatientMergeLog` row counts, so running them concurrently or
 * reordered would race.
 */
describe("admin patient-merge — LOCAL_ADMIN country scope", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];
  let computePhoneBlindIndex: (typeof import("../lib/blind-index.js"))["computePhoneBlindIndex"];
  let bootError: unknown = null;

  const uniq = `mergescope-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Random, not a truncated timestamp: `zi${Date.now()}`.slice(0, 8) keeps only
  // the leading digits, which change roughly every 3 hours, so two runs in one
  // afternoon would tag their fixtures with the same folder codes — and every
  // fixture here shares one phone blind index, so those runs' patients would
  // become each other's duplicate candidates.
  const ieFolder = `zi${Math.random().toString(36).slice(2, 8)}`.toLowerCase();
  const brFolder = `zb${Math.random().toString(36).slice(2, 8)}`.toLowerCase();

  // One shared phone so every fixture profile is a blind-index duplicate of
  // every other — the duplicate search is then purely a scope question.
  const sharedPhone = "+353871234567";

  let ieAdminId = "";
  let brAdminId = "";
  let fullAdminId = "";
  let superAdminId = "";
  let noFolderAdminId = "";

  let iePrimaryId = "";
  let ieDuplicateId = "";
  let brPrimaryId = "";
  let brDuplicateId = "";
  let nullFolderId = "";

  let ieAdminCookie: Record<string, string> = {};
  let fullAdminCookie: Record<string, string> = {};
  let superAdminCookie: Record<string, string> = {};
  let noFolderAdminCookie: Record<string, string> = {};

  const createdProfileIds: string[] = [];

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      computePhoneBlindIndex = (await import("../lib/blind-index.js")).computePhoneBlindIndex;
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
    ) =>
      prisma.user.create({
        data: {
          email: `${label}-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `${label} ${uniq}`,
          role,
          allowedCountryFolders: folders,
        },
      });

    const ieAdmin = await mkAdmin("ie-local-admin", "LOCAL_ADMIN", [ieFolder]);
    const brAdmin = await mkAdmin("br-local-admin", "LOCAL_ADMIN", [brFolder]);
    const fullAdmin = await mkAdmin("full-admin", "ADMIN", []);
    const superAdmin = await mkAdmin("super-admin", "SUPER_ADMIN", []);
    const noFolderAdmin = await mkAdmin("nofolder-local-admin", "LOCAL_ADMIN", []);
    ieAdminId = ieAdmin.id;
    brAdminId = brAdmin.id;
    fullAdminId = fullAdmin.id;
    superAdminId = superAdmin.id;
    noFolderAdminId = noFolderAdmin.id;

    ieAdminCookie = {
      gh_auth: signAuthToken({ sub: ieAdminId, role: "LOCAL_ADMIN", email: ieAdmin.email }),
    };
    fullAdminCookie = {
      gh_auth: signAuthToken({ sub: fullAdminId, role: "ADMIN", email: fullAdmin.email }),
    };
    superAdminCookie = {
      gh_auth: signAuthToken({ sub: superAdminId, role: "SUPER_ADMIN", email: superAdmin.email }),
    };
    noFolderAdminCookie = {
      gh_auth: signAuthToken({
        sub: noFolderAdminId,
        role: "LOCAL_ADMIN",
        email: noFolderAdmin.email,
      }),
    };

    const phoneHash = computePhoneBlindIndex(sharedPhone);

    const mkPatient = async (who: string, folder: string | null) => {
      const row = await prisma.patientProfile.create({
        data: {
          email: `patient-${who}-${uniq}@test.local`,
          fullName: `Patient ${who} ${uniq}`,
          phone: sharedPhone,
          phoneHash,
          countryFolderCode: folder,
        },
      });
      createdProfileIds.push(row.id);
      return row.id;
    };

    iePrimaryId = await mkPatient("ie-primary", ieFolder);
    ieDuplicateId = await mkPatient("ie-duplicate", ieFolder);
    brPrimaryId = await mkPatient("br-primary", brFolder);
    brDuplicateId = await mkPatient("br-duplicate", brFolder);
    nullFolderId = await mkPatient("null-folder", null);
  });

  after(async () => {
    if (app) await app.close();
    if (bootError) return;
    await prisma.patientMergeLog.deleteMany({
      where: { primaryPatientId: { in: createdProfileIds } },
    });
    // AuditLog has an append-only DELETE trigger; test cleanup goes through the
    // shared override helper rather than a plain deleteMany. Scoped to this
    // suite's own synthetic actors and patient rows, and run before those rows
    // are deleted so the ids are still known.
    await deleteAuditLogs(prisma, {
      OR: [
        {
          actorUserId: {
            in: [ieAdminId, brAdminId, fullAdminId, superAdminId, noFolderAdminId],
          },
        },
        { entityId: { in: createdProfileIds } },
      ],
    });
    await prisma.patientProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await prisma.user.deleteMany({
      where: { id: { in: [ieAdminId, brAdminId, fullAdminId, superAdminId, noFolderAdminId] } },
    });
  });

  const boot = (t: { skip: (m?: string) => void }) => {
    if (!app) {
      t.skip(
        `buildApp() failed: ${bootError instanceof Error ? bootError.message : String(bootError)}`,
      );
      return false;
    }
    return true;
  };

  /** Snapshot everything a denied merge must leave untouched. */
  const snapshotWrites = async () => {
    const [profiles, mergeLogs, documents, appointments] = await Promise.all([
      prisma.patientProfile.findMany({
        where: { id: { in: createdProfileIds } },
        select: { id: true, isMerged: true, mergedIntoPatientId: true, mergedAt: true },
        orderBy: { id: "asc" },
      }),
      prisma.patientMergeLog.count({
        where: { primaryPatientId: { in: createdProfileIds } },
      }),
      prisma.medicalDocument.count({
        where: { patientProfileId: { in: createdProfileIds } },
      }),
      prisma.appointment.count({
        where: { email: { contains: uniq } },
      }),
    ]);
    return { profiles, mergeLogs, documents, appointments };
  };

  // ── 1. Duplicate search ───────────────────────────────────────────────────

  it("1. IE LOCAL_ADMIN cannot run the duplicate search on a Brazilian patient", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/duplicates/${brPrimaryId}`,
      cookies: ieAdminCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("2. foreign duplicate candidates are absent from an in-scope lookup", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/duplicates/${iePrimaryId}`,
      cookies: ieAdminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const ids = (
      res.json().data.duplicates as Array<{ patientProfileId: string }>
    ).map((d) => d.patientProfileId);
    assert.ok(ids.includes(ieDuplicateId), "same-folder duplicate is still returned");
    assert.ok(!ids.includes(brPrimaryId), "Brazilian candidate is NOT returned");
    assert.ok(!ids.includes(brDuplicateId), "Brazilian candidate is NOT returned");
    assert.ok(
      !ids.includes(nullFolderId),
      "a patient with no country folder must not leak into a scoped result",
    );
  });

  it("2b. an in-scope candidate stored with an uppercase folder code is still found", async (t) => {
    if (!boot(t)) return;
    // `User.allowedCountryFolders` is always lowercased, but the stored column
    // is not always written that way — consents.route.ts auto-creates a profile
    // with `Appointment.countryCode` verbatim. A case-sensitive clamp would
    // fail closed and silently HIDE a real duplicate from the scoped admin,
    // which is the opposite of what this endpoint exists to do.
    const shouty = await prisma.patientProfile.create({
      data: {
        email: `patient-ie-shouty-${uniq}@test.local`,
        phone: sharedPhone,
        phoneHash: computePhoneBlindIndex(sharedPhone),
        countryFolderCode: ieFolder.toUpperCase(),
      },
    });
    createdProfileIds.push(shouty.id);

    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/duplicates/${iePrimaryId}`,
      cookies: ieAdminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const ids = (
      res.json().data.duplicates as Array<{ patientProfileId: string }>
    ).map((d) => d.patientProfileId);
    assert.ok(ids.includes(shouty.id), "uppercase folder code is still in scope");
  });

  it("3. ADMIN sees cross-country duplicate candidates (unscoped)", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/duplicates/${iePrimaryId}`,
      cookies: fullAdminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const ids = (
      res.json().data.duplicates as Array<{ patientProfileId: string }>
    ).map((d) => d.patientProfileId);
    assert.ok(ids.includes(ieDuplicateId), "ADMIN still sees the same-folder duplicate");
    assert.ok(ids.includes(brDuplicateId), "ADMIN is NOT country-scoped");
  });

  it("4. a LOCAL_ADMIN with no assigned folder fails closed", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/duplicates/${iePrimaryId}`,
      cookies: noFolderAdminCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("5. a patient with a null country folder is out of scope for LOCAL_ADMIN", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/duplicates/${nullFolderId}`,
      cookies: ieAdminCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("6. ADMIN can still read a null-folder patient (fail-closed is LOCAL_ADMIN only)", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/duplicates/${nullFolderId}`,
      cookies: fullAdminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  // ── 2. Merge status ───────────────────────────────────────────────────────

  it("7. IE LOCAL_ADMIN cannot read a Brazilian patient's merge status", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/status/${brPrimaryId}`,
      cookies: ieAdminCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it("8. IE LOCAL_ADMIN can read an in-scope patient's merge status", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/status/${iePrimaryId}`,
      cookies: ieAdminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.isMerged, false);
  });

  it("8b. a nonexistent patient is a 404 for LOCAL_ADMIN and 200 for ADMIN", async (t) => {
    if (!boot(t)) return;
    const missingId = `cmissing${uniq}`.slice(0, 25);
    // Deliberate asymmetry, matching AZ-1: the scope pre-check runs only for
    // LOCAL_ADMIN, so it 404s on a row it cannot find, while ADMIN skips the
    // lookup entirely and keeps `getMergeStatus`'s pre-existing not-merged 200.
    const scoped = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/status/${missingId}`,
      cookies: ieAdminCookie,
    });
    assert.equal(scoped.statusCode, 404, scoped.body);

    const unscoped = await app!.inject({
      method: "GET",
      url: `/api/admin/patient-merge/status/${missingId}`,
      cookies: fullAdminCookie,
    });
    assert.equal(unscoped.statusCode, 200, unscoped.body);
    assert.equal(unscoped.json().data.isMerged, false);
  });

  // ── 3. The merge itself ───────────────────────────────────────────────────

  it("9. IE LOCAL_ADMIN cannot merge an in-scope patient with a foreign one", async (t) => {
    if (!boot(t)) return;
    const before = await snapshotWrites();
    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/patient-merge",
      cookies: ieAdminCookie,
      payload: {
        primaryPatientId: iePrimaryId,
        duplicatePatientId: brDuplicateId,
        reason: "AZ-2 regression probe: cross-country merge attempt",
      },
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.deepEqual(await snapshotWrites(), before, "a denied merge writes nothing");
  });

  it("10. IE LOCAL_ADMIN cannot merge a foreign patient into an in-scope one", async (t) => {
    if (!boot(t)) return;
    const before = await snapshotWrites();
    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/patient-merge",
      cookies: ieAdminCookie,
      payload: {
        primaryPatientId: brPrimaryId,
        duplicatePatientId: ieDuplicateId,
        reason: "AZ-2 regression probe: reversed cross-country merge attempt",
      },
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.deepEqual(await snapshotWrites(), before, "a denied merge writes nothing");
  });

  it("11. IE LOCAL_ADMIN cannot merge two Brazilian patients", async (t) => {
    if (!boot(t)) return;
    const before = await snapshotWrites();
    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/patient-merge",
      cookies: ieAdminCookie,
      payload: {
        primaryPatientId: brPrimaryId,
        duplicatePatientId: brDuplicateId,
        reason: "AZ-2 regression probe: wholly foreign merge attempt",
      },
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.deepEqual(await snapshotWrites(), before, "a denied merge writes nothing");
  });

  it("12. a denied merge records a LOCAL_ADMIN scope audit row", async (t) => {
    if (!boot(t)) return;
    // Scoped to THIS run's freshly-created cuids so a leftover row from an
    // earlier run can't make this pass spuriously.
    const rows = await prisma.auditLog.findMany({
      where: {
        actorUserId: ieAdminId,
        action: "SECURITY_ALERT_CREATED",
        entityId: { in: createdProfileIds },
      },
      select: { entityType: true },
    });
    assert.ok(rows.length > 0, "the denial is auditable");
    assert.ok(
      rows.every((r) => r.entityType === "PatientProfile"),
      "the audit row names the patient resource",
    );
  });

  it("13. same-folder LOCAL_ADMIN merge still succeeds", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/patient-merge",
      cookies: ieAdminCookie,
      payload: {
        primaryPatientId: iePrimaryId,
        duplicatePatientId: ieDuplicateId,
        reason: "AZ-2 regression probe: legitimate same-folder merge",
      },
    });
    assert.equal(res.statusCode, 200, res.body);
    const dup = await prisma.patientProfile.findUnique({
      where: { id: ieDuplicateId },
      select: { isMerged: true, mergedIntoPatientId: true },
    });
    assert.equal(dup?.isMerged, true);
    assert.equal(dup?.mergedIntoPatientId, iePrimaryId);
  });

  it("14. ADMIN can still merge across countries", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/patient-merge",
      cookies: fullAdminCookie,
      payload: {
        primaryPatientId: brPrimaryId,
        duplicatePatientId: nullFolderId,
        reason: "AZ-2 regression probe: ADMIN cross-country merge stays allowed",
      },
    });
    assert.equal(res.statusCode, 200, res.body);
    const dup = await prisma.patientProfile.findUnique({
      where: { id: nullFolderId },
      select: { isMerged: true },
    });
    assert.equal(dup?.isMerged, true);
  });

  it("15. the in-transaction re-check refuses an out-of-scope merge on its own", async (t) => {
    if (!boot(t)) return;
    // The route's pre-flight check catches every case above, which means the
    // authoritative in-transaction check never fires through HTTP. Call the
    // service directly so the TOCTOU backstop — the one that reads the rows
    // the merge is about to rewrite — is itself covered, and prove it rolls
    // back before the merge log or any dependent row moves.
    const { mergePatients, PatientMergeOutOfScopeError } = await import(
      "../modules/patient-merge/patient-merge.service.js"
    );
    const a = await prisma.patientProfile.create({
      data: { email: `patient-tx-a-${uniq}@test.local`, countryFolderCode: ieFolder },
    });
    const b = await prisma.patientProfile.create({
      data: { email: `patient-tx-b-${uniq}@test.local`, countryFolderCode: brFolder },
    });
    createdProfileIds.push(a.id, b.id);

    const before = await snapshotWrites();
    await assert.rejects(
      () =>
        mergePatients({
          primaryPatientId: a.id,
          duplicatePatientId: b.id,
          adminId: ieAdminId,
          reason: "AZ-2 regression probe: in-transaction scope backstop",
          allowedCountryFolders: [ieFolder],
        }),
      PatientMergeOutOfScopeError,
    );
    assert.deepEqual(await snapshotWrites(), before, "the transaction rolled back cleanly");
  });

  it("16. SUPER_ADMIN can still merge across countries", async (t) => {
    if (!boot(t)) return;
    const extraA = await prisma.patientProfile.create({
      data: { email: `patient-sa-a-${uniq}@test.local`, countryFolderCode: ieFolder },
    });
    const extraB = await prisma.patientProfile.create({
      data: { email: `patient-sa-b-${uniq}@test.local`, countryFolderCode: brFolder },
    });
    createdProfileIds.push(extraA.id, extraB.id);

    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/patient-merge",
      cookies: superAdminCookie,
      payload: {
        primaryPatientId: extraA.id,
        duplicatePatientId: extraB.id,
        reason: "AZ-2 regression probe: SUPER_ADMIN cross-country merge stays allowed",
      },
    });
    assert.equal(res.statusCode, 200, res.body);
    const dup = await prisma.patientProfile.findUnique({
      where: { id: extraB.id },
      select: { isMerged: true },
    });
    assert.equal(dup?.isMerged, true);
  });
});

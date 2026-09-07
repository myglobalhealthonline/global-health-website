import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { deleteAuditLogs, deleteMedicalAccessLogs } from "../test-utils/audit-cleanup.js";

/**
 * Group 2 follow-up: two `/api/admin/patients/:email/*` handlers touched PHI
 * with no `guardMedicalRead` call at all — the same class of gap AZ-4 closed on
 * the doctor portal, still open on the admin side:
 *
 *   PATCH /api/admin/patients/:email/profile   (writes the whole clinical +
 *                                               identity surface)
 *   GET   /api/admin/patients/:email/alert-log (returns verbatim clinical
 *                                               free-text — alert wording plus
 *                                               the removal rationale)
 *
 * Two consequences, both proven below. A LOCAL_ADMIN is scoped to a set of
 * country folders and the guard is the ONLY thing that enforces it on a patient
 * record, so an unguarded handler let one edit and read patients in countries
 * they administer nothing in — while the sibling GET .../profile, which does
 * call the guard, correctly refused them. And with no guard call there is no
 * `MedicalAccessLog` row either, so an admin's write to a chart and their read
 * of its clinical alert history left no medical-access trail whatsoever.
 *
 * `POST .../alerts/:type/remove` did call the guard, but resolved its patient
 * with a raw `findUnique({ where: { email } })`. An address is not an identity:
 * anonymization tombstones `PatientProfile.email` and RELEASES the string, so
 * that lookup misses a retained patient's own history and hits whoever
 * registered with the address afterwards. All three handlers now resolve
 * through `resolvePatientContextByPatientEmail`, and the appointment it returns
 * — never a separately-chosen row — is what lands in
 * `MedicalAccessLog.relatedAppointmentId`.
 *
 * The fix must not widen anyone's access: an in-scope LOCAL_ADMIN, a plain
 * ADMIN and a SUPER_ADMIN keep exactly what they had on all three endpoints.
 *
 * `MEDICAL_ACCESS_ENFORCE` is forced ON here and restored in `after` —
 * `.env.test` runs COMPLIANCE_MODE=relaxed, whose default is shadow mode where
 * a deny decision is logged but never blocks.
 *
 * Cases share fixtures and MUST run sequentially in declaration order
 * (node:test's default): the removal cases clear alerts the earlier reads
 * assert on.
 */
describe("admin patient profile — medical access guard + resolved identity", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];
  let env: (typeof import("../config/env.js"))["env"];
  let originalEnforce: boolean | undefined;
  let bootError: unknown = null;

  const uniq = `apg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Random, not a truncated timestamp: `za${Date.now()}`.slice(0, 8) only
  // changes every few hours, so two runs in one afternoon would share folder
  // codes and each other's LOCAL_ADMIN scope.
  const folderA = `za${Math.random().toString(36).slice(2, 6)}`.toLowerCase();
  const folderB = `zb${Math.random().toString(36).slice(2, 6)}`.toLowerCase();

  let localAdminAId = "";
  let fullAdminId = "";
  let superAdminId = "";
  let localAdminACookie: Record<string, string> = {};
  let fullAdminCookie: Record<string, string> = {};
  let superAdminCookie: Record<string, string> = {};

  // Patient A — folder A, inside localAdminA's scope.
  let patientAId = "";
  const patientAEmail = `pa-${uniq}@test.local`;
  // Patient B — folder B, OUTSIDE localAdminA's scope. Carries alert text that
  // must never reach a LOCAL_ADMIN scoped elsewhere.
  let patientBId = "";
  const patientBEmail = `pb-${uniq}@test.local`;
  const B_STATUS_ALERT = `B-status-${uniq}`;
  const B_REMOVAL_NOTE = `B-removal-rationale-${uniq}`;

  // Anonymized patient — the tombstoned profile plus the retained appointment
  // that still carries the address they were treated under.
  let anonPatientId = "";
  const anonRetainedEmail = `anon-retained-${uniq}@test.local`;
  const ANON_REMOVAL_NOTE = `anon-removal-rationale-${uniq}`;

  // Ambiguous address: held by one live profile AND linked to a different
  // patient's appointment. Two provable candidates, so identity fails closed.
  const ambiguousEmail = `dup-${uniq}@test.local`;
  let ambiguousHolderId = "";
  let ambiguousLinkedId = "";

  // Contested address: NO live profile holds it, but two different patients'
  // appointments are linked at it. Ambiguous with nobody to fall back on — the
  // shape a live-holder-only check misses.
  const contestedEmail = `contested-${uniq}@test.local`;

  const createdProfileIds: string[] = [];
  const createdAppointmentIds: string[] = [];
  let countryCode = "";
  // Created mid-suite by the out-of-scope-probe case, cleaned up with the rest.
  let outsiderId = "";

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      signAuthToken = (await import("../utils/auth-session.js")).signAuthToken;
      env = (await import("../config/env.js")).env;
      app = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }
    originalEnforce = env.MEDICAL_ACCESS_ENFORCE;
    env.MEDICAL_ACCESS_ENFORCE = true;
    countryCode = folderA;

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

    const localAdminA = await mkAdmin("local-admin-a", "LOCAL_ADMIN", [folderA]);
    const fullAdmin = await mkAdmin("full-admin", "ADMIN", []);
    const superAdmin = await mkAdmin("super-admin", "SUPER_ADMIN", []);
    localAdminAId = localAdminA.id;
    fullAdminId = fullAdmin.id;
    superAdminId = superAdmin.id;
    localAdminACookie = {
      gh_auth: signAuthToken({ sub: localAdminAId, role: "LOCAL_ADMIN", email: localAdminA.email }),
    };
    fullAdminCookie = {
      gh_auth: signAuthToken({ sub: fullAdminId, role: "ADMIN", email: fullAdmin.email }),
    };
    superAdminCookie = {
      gh_auth: signAuthToken({ sub: superAdminId, role: "SUPER_ADMIN", email: superAdmin.email }),
    };

    const mkPatient = async (data: {
      email: string;
      folder: string | null;
      statusAlert?: string | null;
      clinicAlert?: string | null;
      anonymizedAt?: Date | null;
    }) => {
      const row = await prisma.patientProfile.create({
        data: {
          email: data.email,
          fullName: `Patient ${data.email}`,
          countryFolderCode: data.folder,
          statusAlert: data.statusAlert ?? null,
          clinicAlert: data.clinicAlert ?? null,
          anonymizedAt: data.anonymizedAt ?? null,
        },
      });
      createdProfileIds.push(row.id);
      return row.id;
    };

    patientAId = await mkPatient({
      email: patientAEmail,
      folder: folderA,
      statusAlert: `A-status-${uniq}`,
      clinicAlert: `A-clinic-${uniq}`,
    });
    patientBId = await mkPatient({
      email: patientBEmail,
      folder: folderB,
      statusAlert: B_STATUS_ALERT,
      clinicAlert: `B-clinic-${uniq}`,
    });
    // Tombstoned exactly the way anonymization leaves a record: the address is
    // released, the clinical row is retained.
    anonPatientId = await mkPatient({
      email: `deleted-anon-${uniq}@removed.invalid`,
      folder: folderA,
      statusAlert: `ANON-status-${uniq}`,
      anonymizedAt: new Date(),
    });
    ambiguousHolderId = await mkPatient({ email: ambiguousEmail, folder: folderA });
    ambiguousLinkedId = await mkPatient({
      email: `dup-other-${uniq}@test.local`,
      folder: folderA,
    });

    const mkAppointment = async (email: string, patientProfileId: string) => {
      const row = await prisma.appointment.create({
        data: {
          countryCode,
          consultationType: "GENERAL",
          fullName: `Appt ${email}`,
          email,
          consentAccepted: true,
          patientProfileId,
          status: "COMPLETED",
        },
      });
      createdAppointmentIds.push(row.id);
      return row.id;
    };
    // The retained record's own appointment — the only thing still naming the
    // address the anonymized patient was treated under.
    await mkAppointment(anonRetainedEmail, anonPatientId);
    // A second, distinct patient linked at the address the live holder owns.
    await mkAppointment(ambiguousEmail, ambiguousLinkedId);
    // Two distinct patients linked at an address nobody holds.
    await mkAppointment(contestedEmail, patientAId);
    await mkAppointment(contestedEmail, patientBId);

    const mkAlertLog = async (patientProfileId: string, note: string, newValue: string | null) => {
      await prisma.patientAlertLog.create({
        data: {
          patientProfileId,
          alertType: "STATUS",
          action: "REMOVED",
          previousValue: newValue,
          newValue: null,
          note,
          actorRole: "ADMIN",
          actorName: "fixture",
        },
      });
    };
    await mkAlertLog(patientBId, B_REMOVAL_NOTE, B_STATUS_ALERT);
    await mkAlertLog(anonPatientId, ANON_REMOVAL_NOTE, `ANON-status-${uniq}`);
  });

  after(async () => {
    if (app) await app.close();
    if (bootError) return;
    if (env && originalEnforce !== undefined) {
      env.MEDICAL_ACCESS_ENFORCE = originalEnforce;
    }
    await prisma.securityAlert.deleteMany({
      where: { patientId: { in: createdProfileIds } },
    });
    await deleteMedicalAccessLogs(prisma, {
      patientProfileId: { in: createdProfileIds },
    });
    // AuditLog has an append-only DELETE trigger; cleanup goes through the
    // shared override helper, scoped to this suite's own synthetic rows and run
    // while their ids are still known.
    await deleteAuditLogs(prisma, {
      OR: [
        { actorUserId: { in: [localAdminAId, fullAdminId, superAdminId, outsiderId] } },
        { entityId: { in: createdProfileIds } },
      ],
    });
    await prisma.patientAlertLog.deleteMany({
      where: { patientProfileId: { in: createdProfileIds } },
    });
    await prisma.appointment.deleteMany({ where: { id: { in: createdAppointmentIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await prisma.user.deleteMany({
      where: { id: { in: [localAdminAId, fullAdminId, superAdminId, outsiderId] } },
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

  const patchProfile = async (
    email: string,
    cookies: Record<string, string>,
    payload: Record<string, unknown>,
  ) =>
    app!.inject({
      method: "PATCH",
      url: `/api/admin/patients/${encodeURIComponent(email)}/profile`,
      cookies,
      payload,
    });

  const getAlertLog = async (email: string, cookies: Record<string, string>) =>
    app!.inject({
      method: "GET",
      url: `/api/admin/patients/${encodeURIComponent(email)}/alert-log`,
      cookies,
    });

  const removeAlert = async (
    email: string,
    type: "status" | "clinic",
    cookies: Record<string, string>,
    note: string,
  ) =>
    app!.inject({
      method: "POST",
      url: `/api/admin/patients/${encodeURIComponent(email)}/alerts/${type}/remove`,
      cookies,
      payload: { note },
    });

  const accessLogsFor = (patientProfileId: string, accessedByUserId: string) =>
    prisma.medicalAccessLog.findMany({
      where: { patientProfileId, accessedByUserId },
      orderBy: { createdAt: "asc" },
    });

  // ── The gap: an unguarded admin WRITE ───────────────────────────────────────

  it("refuses a LOCAL_ADMIN's PATCH of a patient outside their country scope", async (t) => {
    if (!boot(t)) return;
    const before = await prisma.patientProfile.findUnique({
      where: { id: patientBId },
      select: { fullName: true },
    });
    const res = await patchProfile(patientBEmail, localAdminACookie, {
      fullName: `Overwritten by out-of-scope admin ${uniq}`,
    });
    assert.equal(res.statusCode, 403, "out-of-scope LOCAL_ADMIN must not write another folder");
    const after = await prisma.patientProfile.findUnique({
      where: { id: patientBId },
      select: { fullName: true },
    });
    assert.equal(after?.fullName, before?.fullName, "denied write must leave the chart untouched");
  });

  it("logs the denied admin write to MedicalAccessLog", async (t) => {
    if (!boot(t)) return;
    const logs = await accessLogsFor(patientBId, localAdminAId);
    const write = logs.find((row) => row.accessAction === "UPDATED");
    assert.ok(write, "an admin PATCH must produce a MedicalAccessLog row");
    assert.equal(write.accessedResourceType, "SENSITIVE_PROFILE");
    assert.equal(write.abnormalReason, "LOCAL_ADMIN_OUT_OF_SCOPE");
    assert.equal(write.isAbnormal, true);
  });

  // ── The gap: an unguarded admin READ of verbatim clinical text ──────────────

  it("refuses a LOCAL_ADMIN's alert-history read outside their country scope", async (t) => {
    if (!boot(t)) return;
    const res = await getAlertLog(patientBEmail, localAdminACookie);
    assert.equal(res.statusCode, 403, "out-of-scope LOCAL_ADMIN must not read alert history");
    assert.ok(
      !res.body.includes(B_STATUS_ALERT) && !res.body.includes(B_REMOVAL_NOTE),
      "a denied response must carry no clinical free-text",
    );
  });

  it("logs the denied alert-history read to MedicalAccessLog", async (t) => {
    if (!boot(t)) return;
    const logs = await accessLogsFor(patientBId, localAdminAId);
    const read = logs.find((row) => row.accessAction === "VIEWED");
    assert.ok(read, "an admin alert-log read must produce a MedicalAccessLog row");
    assert.equal(read.accessedResourceType, "SENSITIVE_PROFILE");
    assert.equal(read.abnormalReason, "LOCAL_ADMIN_OUT_OF_SCOPE");
  });

  // ── Preserved access ────────────────────────────────────────────────────────

  it("keeps an in-scope LOCAL_ADMIN's write and alert-history read, and logs both", async (t) => {
    if (!boot(t)) return;
    const patched = await patchProfile(patientAEmail, localAdminACookie, {
      fullName: `Patient A renamed ${uniq}`,
    });
    assert.equal(patched.statusCode, 200);
    const log = await getAlertLog(patientAEmail, localAdminACookie);
    assert.equal(log.statusCode, 200);

    const logs = await accessLogsFor(patientAId, localAdminAId);
    assert.ok(
      logs.some((row) => row.accessAction === "UPDATED" && row.consentLevelUsed === "LOCAL_ADMIN_SCOPE"),
      "the in-scope write must be logged as an allowed access",
    );
    assert.ok(
      logs.some((row) => row.accessAction === "VIEWED" && row.consentLevelUsed === "LOCAL_ADMIN_SCOPE"),
      "the in-scope alert-log read must be logged as an allowed access",
    );
    assert.ok(
      logs.every((row) => row.isAbnormal === false),
      "in-scope admin access is not abnormal",
    );
  });

  it("keeps ADMIN and SUPER_ADMIN access on both endpoints, in every folder", async (t) => {
    if (!boot(t)) return;
    for (const [label, cookie] of [
      ["ADMIN", fullAdminCookie],
      ["SUPER_ADMIN", superAdminCookie],
    ] as const) {
      const patched = await patchProfile(patientBEmail, cookie, {
        fullName: `Patient B renamed by ${label} ${uniq}`,
      });
      assert.equal(patched.statusCode, 200, `${label} must keep the profile write`);
      const log = await getAlertLog(patientBEmail, cookie);
      assert.equal(log.statusCode, 200, `${label} must keep the alert-history read`);
      const body = log.json() as { data: { entries: { note: string | null }[] } };
      assert.ok(
        body.data.entries.some((entry) => entry.note === B_REMOVAL_NOTE),
        `${label} must still see the alert history`,
      );
    }
  });

  // ── Identity, not the address ───────────────────────────────────────────────

  it("reaches a retained record's alert history through the address it was treated under", async (t) => {
    if (!boot(t)) return;
    const res = await getAlertLog(anonRetainedEmail, fullAdminCookie);
    assert.equal(res.statusCode, 200);
    const body = res.json() as { data: { entries: { note: string | null }[] } };
    assert.ok(
      body.data.entries.some((entry) => entry.note === ANON_REMOVAL_NOTE),
      "a tombstoned profile's retained history must stay reachable via the durable link",
    );
  });

  it("fails closed on an address that resolves to two different patients", async (t) => {
    if (!boot(t)) return;
    const res = await getAlertLog(ambiguousEmail, fullAdminCookie);
    assert.equal(res.statusCode, 200);
    const body = res.json() as { data: { entries: unknown[] } };
    assert.deepEqual(body.data.entries, [], "an ambiguous address must disclose nothing");
    const logs = await prisma.medicalAccessLog.findMany({
      where: { patientProfileId: { in: [ambiguousHolderId, ambiguousLinkedId] } },
    });
    assert.deepEqual(logs, [], "nothing was authorized, so nothing may be logged as accessed");
  });

  it("answers an out-of-scope probe of an anonymized record with 403, not 409", async (t) => {
    if (!boot(t)) return;
    // The anonymized fixture sits in folder A. Scope `localAdminB` to folder B
    // so the ONLY thing separating them from it is the guard. Answering 409
    // ahead of the guard would confirm "a record exists here and it is
    // anonymized" to an admin who may not see it — and log nothing.
    const outsider = await prisma.user.create({
      data: {
        email: `outsider-${uniq}@test.local`,
        passwordHash: "x",
        fullName: `outsider ${uniq}`,
        role: "LOCAL_ADMIN",
        allowedCountryFolders: [folderB],
      },
    });
    outsiderId = outsider.id;
    const cookies = {
      gh_auth: signAuthToken({ sub: outsider.id, role: "LOCAL_ADMIN", email: outsider.email }),
    };
    const patched = await patchProfile(anonRetainedEmail, cookies, {
      fullName: `probe ${uniq}`,
    });
    assert.equal(patched.statusCode, 403, "the scope check must answer before the 409");
    const removed = await removeAlert(anonRetainedEmail, "status", cookies, `probe ${uniq}`);
    assert.equal(removed.statusCode, 403, "the scope check must answer before the 409");
    const logs = await accessLogsFor(anonPatientId, outsider.id);
    assert.equal(logs.length, 2, "both denied attempts must be logged");
    assert.ok(
      logs.every((row) => row.abnormalReason === "LOCAL_ADMIN_OUT_OF_SCOPE"),
      "and logged as out-of-scope denials",
    );
  });

  it("refuses to invent a chart at an address two linked patients already claim", async (t) => {
    if (!boot(t)) return;
    // No live profile holds this address — only two different patients'
    // appointments do. The resolver reports that the same way it reports an
    // unknown address (null), so a fallback that checks the live holder alone
    // would fall through to the create-on-edit path and mint a THIRD chart
    // here, unguarded and unlogged.
    const before = await prisma.patientProfile.count({ where: { email: contestedEmail } });
    assert.equal(before, 0, "fixture: nobody holds this address");
    const res = await patchProfile(contestedEmail, fullAdminCookie, {
      fullName: `invented ${uniq}`,
    });
    assert.equal(res.statusCode, 404, "an ambiguous address is a refusal, not a create");
    assert.equal(
      await prisma.patientProfile.count({ where: { email: contestedEmail } }),
      0,
      "and no chart may be created at it",
    );
  });

  it("still creates on edit when the address is genuinely unheld", async (t) => {
    if (!boot(t)) return;
    // The other side of the same branch: zero candidates of any kind is the
    // admin's long-standing create-on-edit path and must keep working.
    const fresh = `fresh-${uniq}@test.local`;
    const res = await patchProfile(fresh, fullAdminCookie, { fullName: `Fresh ${uniq}` });
    assert.equal(res.statusCode, 200, res.body);
    const created = await prisma.patientProfile.findUnique({ where: { email: fresh } });
    assert.ok(created, "a genuinely unheld address still creates the chart");
    createdProfileIds.push(created.id);
  });

  it("refuses an alert removal on an anonymized record with 409", async (t) => {
    if (!boot(t)) return;
    const res = await removeAlert(
      anonRetainedEmail,
      "status",
      fullAdminCookie,
      `attempted removal ${uniq}`,
    );
    assert.equal(res.statusCode, 409, "an anonymized chart is a retained record; writes are refused");
    const profile = await prisma.patientProfile.findUnique({
      where: { id: anonPatientId },
      select: { statusAlert: true },
    });
    assert.equal(profile?.statusAlert, `ANON-status-${uniq}`, "the alert must survive the refusal");
  });

  // ── Audit rows keyed on the patient, never on a reusable address ────────────

  it("keys the profile-update audit row on patientProfileId, never the email", async (t) => {
    if (!boot(t)) return;
    const rows = await prisma.auditLog.findMany({
      where: { action: "PATIENT_PROFILE_UPDATED", entityId: patientAId },
    });
    assert.ok(rows.length > 0, "the in-scope PATCH must have been audited");
    for (const row of rows) {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      assert.equal(metadata.patientProfileId, patientAId);
      assert.ok(!("email" in metadata), "an audit row must not be keyed on a reusable address");
    }
  });

  it("removes an in-scope alert and audits it on patientProfileId", async (t) => {
    if (!boot(t)) return;
    const res = await removeAlert(patientAEmail, "status", localAdminACookie, `cleared ${uniq}`);
    assert.equal(res.statusCode, 200);
    const rows = await prisma.auditLog.findMany({
      where: { action: "PATIENT_ALERT_UPDATED", entityId: patientAId },
    });
    assert.ok(rows.length > 0, "the removal must have been audited");
    for (const row of rows) {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      assert.equal(metadata.patientProfileId, patientAId);
      assert.ok(!("email" in metadata), "an audit row must not be keyed on a reusable address");
    }
  });

  it("refuses an out-of-scope LOCAL_ADMIN's alert removal", async (t) => {
    if (!boot(t)) return;
    const res = await removeAlert(
      patientBEmail,
      "clinic",
      localAdminACookie,
      `out-of-scope removal ${uniq}`,
    );
    assert.equal(res.statusCode, 403);
    const profile = await prisma.patientProfile.findUnique({
      where: { id: patientBId },
      select: { clinicAlert: true },
    });
    assert.equal(profile?.clinicAlert, `B-clinic-${uniq}`, "the alert must survive the refusal");
  });
});

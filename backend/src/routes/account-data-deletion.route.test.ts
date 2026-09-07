import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";

/**
 * PR-2: the patient-facing formal GDPR erasure endpoints had no test at all —
 * they also had no caller, so nothing exercised them. Wiring the account
 * portal's Data tab to them makes both the authorization gate and the
 * self-scoping worth pinning:
 *
 *  - unauthenticated → 401 on both verbs
 *  - a non-PATIENT session (doctor) → 403, so a staff session can never file
 *    or read an erasure request against a patient record
 *  - a PATIENT with no PatientProfile → 404 rather than a 500
 *  - the happy path creates a DataDeletionRequest against the caller's own
 *    profile, and the list returns only that caller's rows
 *
 * Deliberately NOT loading backend/.env — this runs against the isolated local
 * test cluster.
 */
describe("account data-deletion (patient GDPR erasure request)", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];
  let bootError: unknown = null;

  const uniq = `acctdel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let patientUserId = "";
  let patientProfileId = "";
  let patientCookie: Record<string, string> = {};

  let otherPatientUserId = "";
  let otherPatientProfileId = "";
  let otherRequestId = "";

  let profilelessUserId = "";
  let profilelessCookie: Record<string, string> = {};

  let doctorUserId = "";
  let doctorCookie: Record<string, string> = {};

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

    const mkPatient = async (label: string) => {
      const user = await prisma.user.create({
        data: {
          email: `${label}-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `Patient ${label}`,
          role: "PATIENT",
        },
      });
      const profile = await prisma.patientProfile.create({
        data: { email: user.email, userId: user.id, fullName: user.fullName },
      });
      return { user, profile };
    };

    const main = await mkPatient("main");
    patientUserId = main.user.id;
    patientProfileId = main.profile.id;
    patientCookie = {
      gh_auth: signAuthToken({ sub: main.user.id, role: "PATIENT", email: main.user.email }),
    };

    const other = await mkPatient("other");
    otherPatientUserId = other.user.id;
    otherPatientProfileId = other.profile.id;
    const otherRequest = await prisma.dataDeletionRequest.create({
      data: { patientProfileId: other.profile.id, requestStatus: "SUBMITTED" },
    });
    otherRequestId = otherRequest.id;

    // A PATIENT session with no PatientProfile row behind it.
    const profileless = await prisma.user.create({
      data: {
        email: `profileless-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "No Profile",
        role: "PATIENT",
      },
    });
    profilelessUserId = profileless.id;
    profilelessCookie = {
      gh_auth: signAuthToken({
        sub: profileless.id,
        role: "PATIENT",
        email: profileless.email,
      }),
    };

    const doctorUser = await prisma.user.create({
      data: {
        email: `doctor-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Deletion Test Doctor",
        role: "DOCTOR",
      },
    });
    doctorUserId = doctorUser.id;
    doctorCookie = {
      gh_auth: signAuthToken({ sub: doctorUser.id, role: "DOCTOR", email: doctorUser.email }),
    };
  });

  after(async () => {
    if (!app) return;
    await prisma.dataDeletionRequest.deleteMany({
      where: { patientProfileId: { in: [patientProfileId, otherPatientProfileId] } },
    });
    await prisma.patientProfile.deleteMany({
      where: { id: { in: [patientProfileId, otherPatientProfileId] } },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [patientUserId, otherPatientUserId, profilelessUserId, doctorUserId] },
      },
    });
    await app.close();
  });

  it("rejects an unauthenticated create → 401", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await app.inject({
      method: "POST",
      url: "/api/account/data-deletion",
      payload: {},
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("rejects an unauthenticated list → 401", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await app.inject({ method: "GET", url: "/api/account/data-deletion" });
    assert.equal(res.statusCode, 401, res.body);
  });

  it("rejects a doctor session on both verbs → 403", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const list = await app.inject({
      method: "GET",
      url: "/api/account/data-deletion",
      cookies: doctorCookie,
    });
    assert.equal(list.statusCode, 403, list.body);
    const create = await app.inject({
      method: "POST",
      url: "/api/account/data-deletion",
      cookies: doctorCookie,
      payload: {},
    });
    assert.equal(create.statusCode, 403, create.body);
  });

  // Checked on the list verb, not the create verb: create is rate-limited to
  // 3 per 24h per IP and every app.inject() shares 127.0.0.1, so this suite
  // has a budget of exactly three POSTs (unauthenticated, doctor, happy path).
  it("returns 404 for a patient session with no profile", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await app.inject({
      method: "GET",
      url: "/api/account/data-deletion",
      cookies: profilelessCookie,
    });
    assert.equal(res.statusCode, 404, res.body);
  });

  it("creates a request against the caller's own profile → 201", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await app.inject({
      method: "POST",
      url: "/api/account/data-deletion",
      cookies: patientCookie,
      payload: { reason: "no longer a patient here" },
    });
    assert.equal(res.statusCode, 201, res.body);
    const requestId = res.json().data.requestId as string;
    const row = await prisma.dataDeletionRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
    assert.equal(row.patientProfileId, patientProfileId);
    assert.equal(row.requestStatus, "SUBMITTED");
    // PRIV-002 persists reason + requestType into `notes`; the portal's
    // optional reason must actually survive to the admin queue.
    assert.match(row.notes ?? "", /no longer a patient here/);
  });

  it("lists only the caller's own requests", async (t) => {
    if (!app) return t.skip(`buildApp failed: ${String(bootError)}`);
    const res = await app.inject({
      method: "GET",
      url: "/api/account/data-deletion",
      cookies: patientCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const requests = res.json().data.requests as Array<{
      id: string;
      patientProfileId: string;
      requestStatus: string;
      requestedAt: string;
    }>;
    assert.ok(requests.length >= 1, "the request created above is listed");
    assert.ok(
      requests.every((r) => r.patientProfileId === patientProfileId),
      "no other patient's request is in the payload",
    );
    assert.equal(
      res.body.includes(otherRequestId),
      false,
      "another patient's request id never appears",
    );
    // The portal renders the newest row's status + date, so both must be present.
    assert.ok(requests[0].requestStatus, "requestStatus is exposed");
    assert.ok(requests[0].requestedAt, "requestedAt is exposed");
  });
});

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";

/**
 * AZ-1 regression: /api/admin/appointments* and /api/admin/calendar gated only
 * on `verifyAdminAccess`, which treats LOCAL_ADMIN exactly like ADMIN. A
 * LOCAL_ADMIN scoped to one country's folder could list, read by id, schedule,
 * update and re-status every other country's appointments — patient name,
 * email, phone and consultation notes included — with no block and no audit
 * row. `/api/admin/orders*` was fixed for this same class of bug in the
 * 2026-07-05 review (orders.route.local-admin-scope.test.ts); appointments and
 * the cross-doctor calendar were missed.
 *
 * Deliberately NOT loading backend/.env here (unlike the older sibling test):
 * this suite runs against the isolated local test cluster and must never pull
 * production configuration into the process.
 *
 * The fix must move only LOCAL_ADMIN. ADMIN and SUPER_ADMIN stay unscoped.
 *
 * These cases share one pair of appointment fixtures and MUST run sequentially
 * in declaration order (node:test's default). Tests 4-7 read and reset the
 * Brazilian appointment's `scheduledAt`/`status`; running them concurrently or
 * reordered would race on that row.
 */
describe("admin appointments + calendar — LOCAL_ADMIN country scope", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];
  let bootError: unknown = null;

  const uniq = `apptscope-${Date.now()}`;
  // Slice from the START so the "zi"/"zb" prefix survives: slicing the last 8
  // characters would drop both prefixes and hand the two countries the same
  // epoch digits, which Country.code's unique constraint rejects.
  const ieCode = `zi${Date.now()}`.slice(0, 8).toLowerCase();
  const brCode = `zb${Date.now()}`.slice(0, 8).toLowerCase();

  let currencyId = "";
  let countryIeId = "";
  let countryBrId = "";
  let ieAdminId = "";
  let brAdminId = "";
  let fullAdminId = "";
  let superAdminId = "";
  let ieAppointmentId = "";
  let brAppointmentId = "";
  let ieAdminCookie: Record<string, string> = {};
  let brAdminCookie: Record<string, string> = {};
  let fullAdminCookie: Record<string, string> = {};
  let superAdminCookie: Record<string, string> = {};

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

    const currency = await prisma.currency.create({
      data: { code: `A${Date.now()}`.slice(-9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;

    const mkCountry = async (code: string) =>
      (
        await prisma.country.create({
          data: {
            code,
            name: `Appt Scope ${code} ${uniq}`,
            slug: `appt-scope-${code}-${uniq}`,
            legacyHomePath: `/legacy-${code}-${uniq}`,
            teamPath: `/team-${code}-${uniq}`,
            generalConsultationPath: `/gen-${code}-${uniq}`,
            specialistConsultationPath: `/spec-${code}-${uniq}`,
            currencyId: currency.id,
          },
        })
      ).id;
    countryIeId = await mkCountry(ieCode);
    countryBrId = await mkCountry(brCode);

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

    const ieAdmin = await mkAdmin("ie-local-admin", "LOCAL_ADMIN", [ieCode]);
    const brAdmin = await mkAdmin("br-local-admin", "LOCAL_ADMIN", [brCode]);
    const fullAdmin = await mkAdmin("full-admin", "ADMIN", []);
    const superAdmin = await mkAdmin("super-admin", "SUPER_ADMIN", []);
    ieAdminId = ieAdmin.id;
    brAdminId = brAdmin.id;
    fullAdminId = fullAdmin.id;
    superAdminId = superAdmin.id;

    ieAdminCookie = {
      gh_auth: signAuthToken({ sub: ieAdminId, role: "LOCAL_ADMIN", email: ieAdmin.email }),
    };
    brAdminCookie = {
      gh_auth: signAuthToken({ sub: brAdminId, role: "LOCAL_ADMIN", email: brAdmin.email }),
    };
    fullAdminCookie = {
      gh_auth: signAuthToken({ sub: fullAdminId, role: "ADMIN", email: fullAdmin.email }),
    };
    superAdminCookie = {
      gh_auth: signAuthToken({ sub: superAdminId, role: "SUPER_ADMIN", email: superAdmin.email }),
    };

    const mkAppointment = async (countryCode: string, who: string) =>
      (
        await prisma.appointment.create({
          data: {
            countryCode,
            consultationType: "GENERAL",
            fullName: `Patient ${who} ${uniq}`,
            email: `patient-${who}-${uniq}@test.local`,
            phone: "+353 871234567",
            consentAccepted: true,
          },
        })
      ).id;
    ieAppointmentId = await mkAppointment(ieCode, "ie");
    brAppointmentId = await mkAppointment(brCode, "br");
  });

  after(async () => {
    if (app) await app.close();
    if (bootError) return;
    await prisma.appointment.deleteMany({
      where: { id: { in: [ieAppointmentId, brAppointmentId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [ieAdminId, brAdminId, fullAdminId, superAdminId] } },
    });
    await prisma.country.deleteMany({ where: { id: { in: [countryIeId, countryBrId] } } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  const boot = (t: { skip: (m?: string) => void }) => {
    if (!app) {
      t.skip(`buildApp() failed: ${bootError instanceof Error ? bootError.message : String(bootError)}`);
      return false;
    }
    return true;
  };

  // ── 1. List clamping ──────────────────────────────────────────────────────

  it("1. IE LOCAL_ADMIN list excludes Brazilian appointments", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: "/api/admin/appointments?page=1&pageSize=100",
      cookies: ieAdminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const ids = (res.json().data.items as Array<{ id: string }>).map((a) => a.id);
    assert.ok(ids.includes(ieAppointmentId), "own-country appointment is visible");
    assert.ok(!ids.includes(brAppointmentId), "Brazilian appointment is NOT visible");
  });

  it("2. a supplied Brazilian countryCode cannot bypass the IE scope", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/appointments?page=1&pageSize=100&countryCode=${brCode}`,
      cookies: ieAdminCookie,
    });
    assert.equal(res.statusCode, 200, res.body);
    const ids = (res.json().data.items as Array<{ id: string }>).map((a) => a.id);
    assert.ok(!ids.includes(brAppointmentId), "out-of-scope filter returns no out-of-scope rows");
    assert.ok(
      !ids.includes(ieAppointmentId),
      "an out-of-scope filter must return nothing, not silently fall back to the admin's own country",
    );
  });

  // ── 2. Read by id ─────────────────────────────────────────────────────────

  it("3. IE LOCAL_ADMIN cannot read a Brazilian appointment by id", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/appointments/${brAppointmentId}`,
      cookies: ieAdminCookie,
    });
    assert.equal(res.statusCode, 403, res.body);
    assert.ok(!res.body.includes("patient-br-"), "no out-of-scope patient data in the denial body");
  });

  // ── 3. Mutations ──────────────────────────────────────────────────────────

  it("4. IE LOCAL_ADMIN cannot schedule/reschedule a Brazilian appointment", async (t) => {
    if (!boot(t)) return;
    const scheduledAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const res = await app!.inject({
      method: "PATCH",
      url: `/api/admin/appointments/${brAppointmentId}/schedule`,
      cookies: ieAdminCookie,
      payload: { scheduledAt },
    });
    assert.equal(res.statusCode, 403, res.body);
    const afterRow = await prisma.appointment.findUnique({ where: { id: brAppointmentId } });
    assert.equal(afterRow?.scheduledAt, null, "the out-of-scope appointment was not scheduled");
  });

  it("5. IE LOCAL_ADMIN cannot update a Brazilian appointment", async (t) => {
    if (!boot(t)) return;
    const scheduledAt = new Date(Date.now() + 9 * 24 * 3600 * 1000).toISOString();
    const res = await app!.inject({
      method: "PATCH",
      url: `/api/admin/appointments/${brAppointmentId}/update`,
      cookies: ieAdminCookie,
      payload: { scheduledAt, changeReason: "AZ-1 probe" },
    });
    assert.equal(res.statusCode, 403, res.body);
    const afterRow = await prisma.appointment.findUnique({ where: { id: brAppointmentId } });
    assert.equal(afterRow?.scheduledAt, null, "the out-of-scope appointment was not updated");
  });

  it("6. IE LOCAL_ADMIN cannot change a Brazilian appointment's status", async (t) => {
    if (!boot(t)) return;
    const beforeRow = await prisma.appointment.findUnique({ where: { id: brAppointmentId } });
    const res = await app!.inject({
      method: "PATCH",
      url: `/api/admin/appointments/${brAppointmentId}/status`,
      cookies: ieAdminCookie,
      payload: { status: "CANCELLED" },
    });
    assert.equal(res.statusCode, 403, res.body);
    const afterRow = await prisma.appointment.findUnique({ where: { id: brAppointmentId } });
    assert.equal(afterRow?.status, beforeRow?.status, "status unchanged after a denied mutation");
    assert.notEqual(afterRow?.status, "CANCELLED");
  });

  // ── 4. Calendar ───────────────────────────────────────────────────────────

  const calendarWindow = () => {
    const from = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const to = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    return `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  };

  it("7. IE LOCAL_ADMIN cannot retrieve Brazilian calendar data", async (t) => {
    if (!boot(t)) return;
    // Give the Brazilian appointment a slot inside the window so it would be
    // returned by an unscoped calendar read. `status` is reset explicitly so
    // this test does not depend on what the earlier mutation tests left behind:
    // the calendar hides CANCELLED consultations, and before the fix the
    // status test above really does cancel this row.
    await prisma.appointment.update({
      where: { id: brAppointmentId },
      data: {
        scheduledAt: new Date(Date.now() + 3 * 24 * 3600 * 1000),
        status: "REQUEST_RECEIVED",
      },
    });
    try {
      // Precondition: an unscoped ADMIN really does see this consultation in
      // the same window. Without this the assertions below could pass simply
      // because the fixture never reaches the calendar payload at all.
      const adminView = await app!.inject({
        method: "GET",
        url: `/api/admin/calendar?${calendarWindow()}`,
        cookies: fullAdminCookie,
      });
      assert.equal(adminView.statusCode, 200, adminView.body);
      assert.ok(
        adminView.body.includes(brAppointmentId),
        "precondition: the Brazilian consultation IS visible to an unscoped ADMIN",
      );

      const res = await app!.inject({
        method: "GET",
        url: `/api/admin/calendar?${calendarWindow()}&countryCode=${brCode}`,
        cookies: ieAdminCookie,
      });
      assert.equal(res.statusCode, 200, res.body);
      assert.ok(
        !res.body.includes(brAppointmentId),
        "an IE-scoped LOCAL_ADMIN sees no Brazilian consultation in the calendar",
      );

      const unfiltered = await app!.inject({
        method: "GET",
        url: `/api/admin/calendar?${calendarWindow()}`,
        cookies: ieAdminCookie,
      });
      assert.equal(unfiltered.statusCode, 200, unfiltered.body);
      assert.ok(
        !unfiltered.body.includes(brAppointmentId),
        "…and not via an unfiltered calendar read either",
      );
    } finally {
      await prisma.appointment.update({
        where: { id: brAppointmentId },
        data: { scheduledAt: null },
      });
    }
  });

  // ── 5. Reverse direction ──────────────────────────────────────────────────

  it("8. BR LOCAL_ADMIN is blocked symmetrically on the IE appointment", async (t) => {
    if (!boot(t)) return;
    const res = await app!.inject({
      method: "GET",
      url: `/api/admin/appointments/${ieAppointmentId}`,
      cookies: brAdminCookie,
    });
    assert.equal(res.statusCode, 403, res.body);

    const list = await app!.inject({
      method: "GET",
      url: "/api/admin/appointments?page=1&pageSize=100",
      cookies: brAdminCookie,
    });
    const ids = (list.json().data.items as Array<{ id: string }>).map((a) => a.id);
    assert.ok(ids.includes(brAppointmentId), "own-country appointment visible");
    assert.ok(!ids.includes(ieAppointmentId), "IE appointment not visible to a BR-scoped admin");
  });

  // ── 6. In-country LOCAL_ADMIN still works ─────────────────────────────────

  it("9. IE LOCAL_ADMIN retains full access to its own country's appointment", async (t) => {
    if (!boot(t)) return;
    const read = await app!.inject({
      method: "GET",
      url: `/api/admin/appointments/${ieAppointmentId}`,
      cookies: ieAdminCookie,
    });
    assert.equal(read.statusCode, 200, read.body);

    const scheduledAt = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
    const schedule = await app!.inject({
      method: "PATCH",
      url: `/api/admin/appointments/${ieAppointmentId}/schedule`,
      cookies: ieAdminCookie,
      payload: { scheduledAt },
    });
    assert.equal(schedule.statusCode, 200, schedule.body);
    const afterRow = await prisma.appointment.findUnique({ where: { id: ieAppointmentId } });
    assert.ok(afterRow?.scheduledAt, "the in-scope appointment WAS scheduled");

    const calendar = await app!.inject({
      method: "GET",
      url: `/api/admin/calendar?${calendarWindow()}`,
      cookies: ieAdminCookie,
    });
    assert.equal(calendar.statusCode, 200, calendar.body);
    assert.ok(
      calendar.body.includes(ieAppointmentId),
      "the in-scope consultation is still on the calendar",
    );
  });

  // ── 7. ADMIN / SUPER_ADMIN remain unscoped ────────────────────────────────

  it("10. ADMIN remains unscoped across both countries", async (t) => {
    if (!boot(t)) return;
    for (const id of [ieAppointmentId, brAppointmentId]) {
      const res = await app!.inject({
        method: "GET",
        url: `/api/admin/appointments/${id}`,
        cookies: fullAdminCookie,
      });
      assert.equal(res.statusCode, 200, res.body);
    }
    const list = await app!.inject({
      method: "GET",
      url: "/api/admin/appointments?page=1&pageSize=100",
      cookies: fullAdminCookie,
    });
    const ids = (list.json().data.items as Array<{ id: string }>).map((a) => a.id);
    assert.ok(ids.includes(ieAppointmentId) && ids.includes(brAppointmentId), "ADMIN sees both");
  });

  it("11. SUPER_ADMIN remains unscoped across both countries", async (t) => {
    if (!boot(t)) return;
    for (const id of [ieAppointmentId, brAppointmentId]) {
      const res = await app!.inject({
        method: "GET",
        url: `/api/admin/appointments/${id}`,
        cookies: superAdminCookie,
      });
      assert.equal(res.statusCode, 200, res.body);
    }
    const calendar = await app!.inject({
      method: "GET",
      url: `/api/admin/calendar?${calendarWindow()}`,
      cookies: superAdminCookie,
    });
    assert.equal(calendar.statusCode, 200, calendar.body);
  });

  // ── 8. Unauthenticated stays denied ───────────────────────────────────────

  // ── 9. Manual creation ────────────────────────────────────────────────────
  // Found by the AZ-1 security review: the five read/mutate routes were fixed
  // but `POST /api/admin/appointments` still took `countryCode` straight from
  // the body, so an IE-scoped admin could open a Brazilian booking (patient
  // account, order, Stripe session, and a claimed Brazilian doctor slot). The
  // ids below are deliberately non-resolvable: the scope check must reject the
  // request before the booking pipeline ever looks them up, so a 403 here — and
  // not a 404/422 from the service — is what proves the ordering.
  it("13. IE LOCAL_ADMIN cannot open a Brazilian manual booking", async (t) => {
    if (!boot(t)) return;
    const payload = {
      patient: {
        email: `walkin-${uniq}@test.local`,
        fullName: "Walk In Patient",
        phone: "+353 871234567",
      },
      serviceId: `no-such-service-${uniq}`.slice(0, 60),
      doctorId: `no-such-doctor-${uniq}`.slice(0, 60),
      timeSlotId: `no-such-slot-${uniq}`,
      countryCode: brCode,
    };
    const countBefore = await prisma.appointment.count({ where: { countryCode: brCode } });

    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/appointments",
      cookies: ieAdminCookie,
      payload,
    });
    assert.equal(res.statusCode, 403, res.body);

    const countAfter = await prisma.appointment.count({ where: { countryCode: brCode } });
    assert.equal(countAfter, countBefore, "the denied creation wrote no appointment");
    const leakedUser = await prisma.user.findUnique({ where: { email: payload.patient.email } });
    assert.equal(leakedUser, null, "the denied creation provisioned no patient account");
  });

  it("14. IE LOCAL_ADMIN's own-country manual booking still reaches the booking pipeline", async (t) => {
    if (!boot(t)) return;
    // Same non-resolvable ids, but in the admin's OWN country: the scope check
    // must pass it through, so the failure has to come from the booking service
    // (unknown service/doctor/slot), never from a country 403.
    const res = await app!.inject({
      method: "POST",
      url: "/api/admin/appointments",
      cookies: ieAdminCookie,
      payload: {
        patient: {
          email: `walkin-ie-${uniq}@test.local`,
          fullName: "Walk In Patient IE",
          phone: "+353 871234567",
        },
        serviceId: `no-such-service-ie-${uniq}`.slice(0, 60),
        doctorId: `no-such-doctor-ie-${uniq}`.slice(0, 60),
        timeSlotId: `no-such-slot-ie-${uniq}`,
        countryCode: ieCode,
      },
    });
    assert.notEqual(res.statusCode, 403, `in-scope creation must not be country-blocked: ${res.body}`);
  });

  it("12. an unauthenticated request is still rejected on both surfaces", async (t) => {
    if (!boot(t)) return;
    const appts = await app!.inject({ method: "GET", url: "/api/admin/appointments" });
    assert.ok([401, 403].includes(appts.statusCode), appts.body);
    const calendar = await app!.inject({
      method: "GET",
      url: `/api/admin/calendar?${calendarWindow()}`,
    });
    assert.ok([401, 403].includes(calendar.statusCode), calendar.body);
  });
});

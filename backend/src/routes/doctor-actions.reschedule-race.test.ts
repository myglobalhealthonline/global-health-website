import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { uniqueCurrencyCode } from "../test-utils/unique-currency-code.js";

/**
 * `PATCH /api/doctor/appointments/:id` decided its 24h reminder re-arm from
 * `isReschedule`, a comparison against the row it read at the top of the
 * handler — before the previous-slot lookup and the slot release, each its own
 * database round trip. A concurrent move landing in that window makes the
 * comparison describe a change that is no longer the one being applied.
 *
 * The failure that costs a patient their reminder:
 *   - the handler reads `scheduledAt = T1`
 *   - a concurrent writer moves the consultation to T2, and the reminder for T2
 *     is delivered (`reminderSentAt` stamped)
 *   - the doctor submits T1 — still what their workspace showed — so
 *     `isReschedule` is false against the stale snapshot
 *   - the update lands `scheduledAt = T1`. The time really changed (T2 → T1),
 *     but the marker survives, and nothing revisits a row whose marker says
 *     "delivered".
 *
 * The mirror defect clears a marker for a change that never committed, which
 * re-sends a reminder the patient already has.
 *
 * Deterministic interleave: `prisma.appointment.findFirst` is wrapped so exactly
 * one armed concurrent write fires the instant the handler's own scoped read
 * returns. Real HTTP through `app.inject`, real transaction — only the timing
 * is injected. Authorization, slot handling and notifications are untouched.
 */
describe("doctor reschedule — stale pre-write snapshot", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let bootError: unknown = null;

  const uniq = `docrace-${Date.now()}`;
  const countryCode = `zd${Date.now()}`.slice(0, 8).toLowerCase();

  let currencyId = "";
  let countryId = "";
  let doctorId = "";
  let otherDoctorId = "";
  let doctorUserId = "";
  let doctorCookie: Record<string, string> = {};
  const appointmentIds: string[] = [];

  /** Fires once, immediately after the handler's own scoped row read. */
  let armed: (() => Promise<void>) | null = null;
  /** Appointment the arm belongs to, so a read of any other row can't spend it. */
  let armedFor: string | null = null;
  let originalFindFirst: ((args: unknown) => Promise<unknown>) | null = null;

  const SENT = new Date("2026-09-01T00:00:00.000Z");
  const DELIVERED_LATER = new Date("2026-09-02T00:00:00.000Z");
  const T1 = new Date("2026-12-01T09:00:00.000Z");
  const T2 = new Date("2026-12-02T11:00:00.000Z");

  const mkAppointment = async (over: Record<string, unknown> = {}) => {
    const row = await prisma.appointment.create({
      data: {
        countryCode,
        consultationType: "GENERAL",
        fullName: `Patient ${uniq}`,
        email: `patient-${appointmentIds.length}-${uniq}@test.local`,
        consentAccepted: true,
        doctorId,
        scheduledAt: T1,
        reminderSentAt: SENT,
        doctorReminderSentAt: SENT,
        ...over,
      },
    });
    appointmentIds.push(row.id);
    return row.id;
  };

  const readBack = async (id: string) =>
    prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: {
        scheduledAt: true,
        doctorId: true,
        status: true,
        consultationMode: true,
        reminderSentAt: true,
        doctorReminderSentAt: true,
      },
    });

  const patch = (id: string, payload: Record<string, unknown>) =>
    app!.inject({
      method: "PATCH",
      url: `/api/doctor/appointments/${id}`,
      cookies: doctorCookie,
      payload,
    });

  before(async () => {
    try {
      const { buildApp } = await import("../app.js");
      prisma = (await import("../db/prisma.js")).prisma;
      const { signAuthToken } = await import("../utils/auth-session.js");
      app = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");

      currencyId = (
        await prisma.currency.create({
          data: { code: uniqueCurrencyCode(), symbol: "€", decimals: 2 },
        })
      ).id;
      countryId = (
        await prisma.country.create({
          data: {
            code: countryCode,
            name: `Doc Race ${uniq}`,
            slug: `doc-race-${uniq}`,
            legacyHomePath: `/legacy-${uniq}`,
            teamPath: `/team-${uniq}`,
            generalConsultationPath: `/gen-${uniq}`,
            specialistConsultationPath: `/spec-${uniq}`,
            currencyId,
          },
        })
      ).id;
      const mkDoctor = async (label: string) =>
        (
          await prisma.doctor.create({
            data: {
              countryId,
              slug: `doc-${label}-${uniq}`,
              fullName: `Dr ${label} ${uniq}`,
              title: "GP",
              active: true,
            },
          })
        ).id;
      doctorId = await mkDoctor("self");
      otherDoctorId = await mkDoctor("other");

      const doctorUser = await prisma.user.create({
        data: {
          email: `doctor-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `Dr Self ${uniq}`,
          role: "DOCTOR",
          doctorId,
        },
      });
      doctorUserId = doctorUser.id;
      doctorCookie = {
        gh_auth: signAuthToken({
          sub: doctorUserId,
          role: "DOCTOR",
          email: doctorUser.email,
        }),
      };
    } catch (err) {
      bootError = err;
      return;
    }

    const delegate = prisma.appointment as unknown as Record<string, unknown>;
    originalFindFirst = (delegate.findFirst as (a: unknown) => Promise<unknown>).bind(
      prisma.appointment,
    );
    delegate.findFirst = async (args: unknown) => {
      const result = await originalFindFirst!(args);
      const readId = (args as { where?: { id?: unknown } } | undefined)?.where?.id;
      if (armed && readId === armedFor) {
        const fire = armed;
        armed = null;
        armedFor = null;
        await fire();
      }
      return result;
    };
  });

  after(async () => {
    const delegate = prisma?.appointment as unknown as Record<string, unknown>;
    if (originalFindFirst) delegate.findFirst = originalFindFirst;
    if (app) await app.close();
    if (bootError) return;
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.user.deleteMany({ where: { id: doctorUserId } });
    await prisma.doctor.deleteMany({ where: { id: { in: [doctorId, otherDoctorId] } } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  const boot = (t: { skip: (m?: string) => void }) => {
    if (!app) {
      t.skip(
        `boot failed: ${bootError instanceof Error ? bootError.message : String(bootError)}`,
      );
      return false;
    }
    return true;
  };

  it("1. a concurrent move still re-arms both markers", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();
    armedFor = id;
    armed = async () => {
      await prisma.appointment.update({
        where: { id },
        data: {
          scheduledAt: T2,
          reminderSentAt: DELIVERED_LATER,
          doctorReminderSentAt: DELIVERED_LATER,
        },
      });
    };

    // The doctor's workspace still shows T1, so the stale comparison reads
    // "no time change" while the write really moves the row T2 → T1.
    const res = await patch(id, { scheduledAt: T1.toISOString() });
    assert.equal(res.statusCode, 200, res.body);

    const row = await readBack(id);
    assert.equal(
      row.scheduledAt?.toISOString(),
      T1.toISOString(),
      "the write really did change the consultation's time",
    );
    assert.equal(
      row.reminderSentAt,
      null,
      "a marker left standing over a time that no longer exists is never revisited — the reminder is missed for good",
    );
    assert.equal(row.doctorReminderSentAt, null);
  });

  it("2. a submission the row already carries re-arms nothing", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();
    // Someone else already moved it to exactly the time this doctor submits,
    // and the reminder for that time has gone out.
    armedFor = id;
    armed = async () => {
      await prisma.appointment.update({
        where: { id },
        data: {
          scheduledAt: T2,
          reminderSentAt: DELIVERED_LATER,
          doctorReminderSentAt: DELIVERED_LATER,
        },
      });
    };

    const res = await patch(id, { scheduledAt: T2.toISOString() });
    assert.equal(res.statusCode, 200, res.body);

    const row = await readBack(id);
    assert.equal(row.scheduledAt?.toISOString(), T2.toISOString());
    assert.equal(
      row.reminderSentAt?.toISOString(),
      DELIVERED_LATER.toISOString(),
      "the committed time did not change — clearing here re-sends a reminder the patient already has",
    );
    assert.equal(
      row.doctorReminderSentAt?.toISOString(),
      DELIVERED_LATER.toISOString(),
    );
  });

  it("3. an ordinary reschedule is unchanged: 200, new time, both markers re-armed", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();

    const res = await patch(id, { scheduledAt: T2.toISOString() });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json().data.appointment as Record<string, unknown>;
    assert.equal(body.id, id);
    assert.equal(body.scheduledAt, T2.toISOString());
    assert.ok(typeof body.updatedAt === "string", "response shape is preserved");
    assert.ok("status" in body && "meetingUrl" in body && "consultationMode" in body);

    const row = await readBack(id);
    assert.equal(row.scheduledAt?.toISOString(), T2.toISOString());
    assert.equal(row.reminderSentAt, null);
    assert.equal(row.doctorReminderSentAt, null);
  });

  it("4. a non-time edit leaves both markers alone", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();

    const res = await patch(id, { consultationMode: "IN_PERSON" });
    assert.equal(res.statusCode, 200, res.body);

    const row = await readBack(id);
    assert.equal(row.consultationMode, "IN_PERSON");
    assert.equal(row.scheduledAt?.toISOString(), T1.toISOString());
    assert.equal(row.reminderSentAt?.toISOString(), SENT.toISOString());
    assert.equal(row.doctorReminderSentAt?.toISOString(), SENT.toISOString());
  });

  it("5. another doctor's appointment is still 404, and untouched", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment({ doctorId: otherDoctorId });

    const res = await patch(id, { scheduledAt: T2.toISOString() });
    assert.equal(res.statusCode, 404, res.body);

    const row = await readBack(id);
    assert.equal(row.scheduledAt?.toISOString(), T1.toISOString());
    assert.equal(row.reminderSentAt?.toISOString(), SENT.toISOString());
  });
});

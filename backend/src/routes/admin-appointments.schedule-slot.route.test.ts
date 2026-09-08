import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";

/**
 * `/api/admin/appointments/:id/schedule` released the appointment's
 * DoctorTimeSlot on a time change and never claimed one at the new time, and
 * did nothing at all when the doctor was swapped. Either way the consultation
 * ended up backed by no reservation while the booking page went on selling that
 * hour — the shape of the 2026-09-08 incident, where one doctor was booked twice
 * in the same hour (a manual booking moved onto him, then a website booking that
 * bought the hour the move never reserved).
 *
 * Route-level on purpose: the slot logic itself lives in
 * appointment-slot-move.service, so only an end-to-end call can catch this
 * endpoint failing to call it.
 *
 * Deliberately NOT loading backend/.env — this suite runs against the isolated
 * local test cluster and must never pull production configuration in.
 */
describe("admin /schedule — the new time is actually reserved", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../utils/auth-session.js"))["signAuthToken"];
  let bootError: unknown = null;

  const uniq = `schedslot-${Date.now()}`;
  const countryCode = `zk${Date.now()}`.slice(0, 8).toLowerCase();
  const T1 = new Date("2026-12-04T09:00:00.000Z");
  const T2 = new Date("2026-12-04T10:00:00.000Z");

  let currencyId = "";
  let countryId = "";
  let doctorId = "";
  let adminCookie: Record<string, string> = {};
  const appointmentIds: string[] = [];

  const mkSlot = async (startAt: Date, status: "OPEN" | "BOOKED") =>
    (
      await prisma.doctorTimeSlot.create({
        data: {
          doctorId,
          startAt,
          endAt: new Date(startAt.getTime() + 15 * 60_000),
          status,
        },
      })
    ).id;

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
        ...over,
      },
    });
    appointmentIds.push(row.id);
    return row.id;
  };

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

    currencyId = (
      await prisma.currency.create({
        data: { code: `A${Date.now()}`.slice(-9), symbol: "€", decimals: 2 },
      })
    ).id;
    countryId = (
      await prisma.country.create({
        data: {
          code: countryCode,
          name: `Sched ${uniq}`,
          slug: `sched-${uniq}`,
          legacyHomePath: `/legacy-${uniq}`,
          teamPath: `/team-${uniq}`,
          generalConsultationPath: `/gen-${uniq}`,
          specialistConsultationPath: `/spec-${uniq}`,
          currencyId,
        },
      })
    ).id;
    doctorId = (
      await prisma.doctor.create({
        data: {
          countryId,
          slug: `doc-${uniq}`,
          fullName: `Dr Sched ${uniq}`,
          title: "GP",
          active: true,
        },
      })
    ).id;
    const admin = await prisma.user.create({
      data: {
        email: `admin-${uniq}@test.local`,
        passwordHash: "x",
        fullName: `Admin ${uniq}`,
        role: "ADMIN",
        allowedCountryFolders: [],
      },
    });
    adminCookie = {
      gh_auth: signAuthToken({ sub: admin.id, role: "ADMIN", email: admin.email }),
    };
  });

  after(async () => {
    if (bootError) return;
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.doctorTimeSlot.deleteMany({ where: { doctorId } });
    await prisma.doctor.deleteMany({ where: { id: doctorId } });
    await prisma.user.deleteMany({ where: { email: `admin-${uniq}@test.local` } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    await app?.close();
  });

  const boot = (t: { skip: (m?: string) => void }) => {
    if (bootError) {
      t.skip(
        `boot failed: ${bootError instanceof Error ? bootError.message : String(bootError)}`,
      );
      return false;
    }
    return true;
  };

  it("1. a reschedule claims a slot at the new time and frees the old one", async (t) => {
    if (!boot(t)) return;
    const oldSlot = await mkSlot(T1, "BOOKED");
    await mkSlot(T2, "OPEN");
    const id = await mkAppointment({ timeSlotId: oldSlot });

    const res = await app!.inject({
      method: "PATCH",
      url: `/api/admin/appointments/${id}/schedule`,
      cookies: adminCookie,
      payload: { scheduledAt: T2.toISOString() },
    });
    assert.equal(res.statusCode, 200, res.body);

    const row = await prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: { timeSlot: { select: { startAt: true, status: true } } },
    });
    assert.ok(
      row.timeSlot,
      "the new time must be backed by a reservation — releasing without claiming leaves the hour on sale",
    );
    assert.equal(row.timeSlot.startAt.toISOString(), T2.toISOString());
    assert.equal(row.timeSlot.status, "BOOKED");

    const stillBookedAtT1 = await prisma.doctorTimeSlot.findFirst({
      where: { doctorId, startAt: T1, status: "BOOKED" },
      select: { id: true },
    });
    assert.equal(stillBookedAtT1, null, "the old hour is given back");
  });

  it("2. a move onto an hour that is already taken is refused with 409", async (t) => {
    if (!boot(t)) return;
    const oldSlot = await mkSlot(T1, "BOOKED");
    const takenSlot = await mkSlot(T2, "BOOKED");
    const other = await mkAppointment({ scheduledAt: T2, timeSlotId: takenSlot });
    const id = await mkAppointment({ timeSlotId: oldSlot });

    const res = await app!.inject({
      method: "PATCH",
      url: `/api/admin/appointments/${id}/schedule`,
      cookies: adminCookie,
      payload: { scheduledAt: T2.toISOString() },
    });
    assert.equal(res.statusCode, 409, res.body);

    const row = await prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: { scheduledAt: true, timeSlotId: true },
    });
    assert.equal(row.scheduledAt?.toISOString(), T1.toISOString());
    assert.equal(
      row.timeSlotId,
      oldSlot,
      "a refused move must not strip the existing reservation",
    );

    const otherRow = await prisma.appointment.findUniqueOrThrow({
      where: { id: other },
      select: { timeSlotId: true },
    });
    assert.equal(otherRow.timeSlotId, takenSlot, "the sitting booking is untouched");
  });
});

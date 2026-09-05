import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { uniqueCurrencyCode } from "../../test-utils/unique-currency-code.js";

/**
 * Re-arming the 24h reminder markers, across EVERY production writer that can
 * move a consultation's `scheduledAt` or swap its doctor.
 *
 * The bug: `reminderSentAt` / `doctorReminderSentAt` mean "already sent", and
 * nothing cleared them on a reschedule. A consultation moved after its reminder
 * went out therefore never got a second one — the patient's only reminder named
 * the old time — and a reassigned doctor was never told at all, because the
 * marker the OLD doctor's notification set still stood.
 *
 * The reset has to ride in the SAME write as the move. A post-commit reset has
 * a crash window in which the row already carries the new time with the old
 * marker standing, and that reminder is then missed permanently — nothing ever
 * revisits it.
 *
 * The four writers, all covered below:
 *   1. `adminUpdateAppointment`            — admin order page (time and/or doctor)
 *   2. `rescheduleAppointmentForPatient`   — patient self-service
 *   3. `scheduleAppointment`               — admin schedule endpoint
 *   4. `PATCH /api/doctor/appointments/:id` — doctor workspace
 *
 * DB-backed: atomicity is the property under test, and only a real transaction
 * can demonstrate it.
 */
describe("24h reminder re-arm — every scheduledAt/doctor writer", () => {
  let app: FastifyInstance | null = null;
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let signAuthToken: (typeof import("../../utils/auth-session.js"))["signAuthToken"];
  let svcAppointments: typeof import("./appointments.service.js");
  let svcAdminUpdate: typeof import("./admin-update-appointment.service.js");
  let bootError: unknown = null;

  const uniq = `rearm-${Date.now()}`;
  const countryCode = `zr${Date.now()}`.slice(0, 8).toLowerCase();

  let currencyId = "";
  let countryId = "";
  let doctorAId = "";
  let doctorBId = "";
  let doctorUserId = "";
  let patientUserId = "";
  let doctorCookie: Record<string, string> = {};
  const appointmentIds: string[] = [];
  const slotIds: string[] = [];

  const SENT = new Date("2026-09-01T00:00:00.000Z");
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
        doctorId: doctorAId,
        scheduledAt: T1,
        reminderSentAt: SENT,
        doctorReminderSentAt: SENT,
        ...over,
      },
    });
    appointmentIds.push(row.id);
    return row.id;
  };

  const markers = async (id: string) =>
    prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: {
        scheduledAt: true,
        doctorId: true,
        reminderSentAt: true,
        doctorReminderSentAt: true,
        doctorNoShowNotifiedAt: true,
      },
    });

  before(async () => {
    try {
      const { buildApp } = await import("../../app.js");
      prisma = (await import("../../db/prisma.js")).prisma;
      signAuthToken = (await import("../../utils/auth-session.js")).signAuthToken;
      svcAppointments = await import("./appointments.service.js");
      svcAdminUpdate = await import("./admin-update-appointment.service.js");
      app = await buildApp();
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }

    currencyId = (
      await prisma.currency.create({
        data: { code: uniqueCurrencyCode(), symbol: "€", decimals: 2 },
      })
    ).id;
    countryId = (
      await prisma.country.create({
        data: {
          code: countryCode,
          name: `Rearm ${uniq}`,
          slug: `rearm-${uniq}`,
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
    doctorAId = await mkDoctor("a");
    doctorBId = await mkDoctor("b");

    const doctorUser = await prisma.user.create({
      data: {
        email: `doctor-${uniq}@test.local`,
        passwordHash: "x",
        fullName: `Dr A ${uniq}`,
        role: "DOCTOR",
        doctorId: doctorAId,
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

    patientUserId = (
      await prisma.user.create({
        data: {
          email: `patient-${uniq}@test.local`,
          passwordHash: "x",
          fullName: `Patient ${uniq}`,
          role: "PATIENT",
        },
      })
    ).id;
  });

  after(async () => {
    if (app) await app.close();
    if (bootError) return;
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.doctorTimeSlot.deleteMany({ where: { doctorId: { in: [doctorAId, doctorBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [doctorUserId, patientUserId] } } });
    await prisma.doctor.deleteMany({ where: { id: { in: [doctorAId, doctorBId] } } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
    void slotIds;
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

  // ── Writer 1: admin order page ────────────────────────────────────────────

  it("1a. adminUpdateAppointment — a time change clears BOTH markers, atomically", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();

    await svcAdminUpdate.adminUpdateAppointment({
      appointmentId: id,
      scheduledAt: T2,
      changeReason: "patient asked to move",
    });

    const row = await markers(id);
    assert.equal(row.scheduledAt?.toISOString(), T2.toISOString());
    assert.equal(row.reminderSentAt, null, "the patient must be reminded of the NEW time");
    assert.equal(row.doctorReminderSentAt, null, "so must the doctor");
  });

  it("1b. adminUpdateAppointment — a doctor-only swap clears ONLY the doctor marker", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();

    await svcAdminUpdate.adminUpdateAppointment({
      appointmentId: id,
      doctorId: doctorBId,
      changeReason: "reassigned",
    });

    const row = await markers(id);
    assert.equal(row.doctorId, doctorBId);
    assert.equal(
      row.doctorReminderSentAt,
      null,
      "the marker was set by the OLD doctor's notification — the new one has heard nothing",
    );
    assert.equal(
      row.reminderSentAt?.toISOString(),
      SENT.toISOString(),
      "the time did not move, so the patient must NOT be emailed a second time",
    );
    assert.equal(row.scheduledAt?.toISOString(), T1.toISOString());
  });

  // ── Writer 2: patient self-service ────────────────────────────────────────

  it("2. rescheduleAppointmentForPatient clears both markers in the move transaction", async (t) => {
    if (!boot(t)) return;
    const base = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    base.setUTCMinutes(0, 0, 0);
    const mkSlot = async (offsetHours: number, status: "OPEN" | "BOOKED") => {
      const startAt = new Date(base.getTime() + offsetHours * 3600 * 1000);
      const slot = await prisma.doctorTimeSlot.create({
        data: {
          doctorId: doctorAId,
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60_000),
          status,
          isAdHoc: true,
        },
      });
      slotIds.push(slot.id);
      return slot;
    };
    const oldSlot = await mkSlot(0, "BOOKED");
    const newSlot = await mkSlot(2, "OPEN");
    const id = await mkAppointment({
      userId: patientUserId,
      timeSlotId: oldSlot.id,
      scheduledAt: oldSlot.startAt,
    });

    await svcAppointments.rescheduleAppointmentForPatient(id, patientUserId, newSlot.id);

    const row = await markers(id);
    assert.equal(row.scheduledAt?.toISOString(), newSlot.startAt.toISOString());
    assert.equal(row.reminderSentAt, null);
    assert.equal(row.doctorReminderSentAt, null);
  });

  // ── Writer 3: admin schedule endpoint ─────────────────────────────────────

  it("3a. scheduleAppointment — a time change clears BOTH markers", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();

    await svcAppointments.scheduleAppointment(id, { scheduledAt: T2 });

    const row = await markers(id);
    assert.equal(row.scheduledAt?.toISOString(), T2.toISOString());
    assert.equal(row.reminderSentAt, null);
    assert.equal(row.doctorReminderSentAt, null);
  });

  it("3b. scheduleAppointment — a doctor-only swap clears ONLY the doctor marker", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();

    await svcAppointments.scheduleAppointment(id, { doctorId: doctorBId });

    const row = await markers(id);
    assert.equal(row.doctorId, doctorBId);
    assert.equal(row.doctorReminderSentAt, null);
    assert.equal(row.reminderSentAt?.toISOString(), SENT.toISOString());
  });

  it("3c. scheduleAppointment — an unrelated edit re-arms nothing", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();

    await svcAppointments.scheduleAppointment(id, {
      meetingUrl: "https://meet.google.com/abc-defg-hij",
    });

    const row = await markers(id);
    assert.equal(
      row.reminderSentAt?.toISOString(),
      SENT.toISOString(),
      "re-arming on an unchanged time would re-send a reminder the patient already has",
    );
    assert.equal(row.doctorReminderSentAt?.toISOString(), SENT.toISOString());
  });

  // ── Writer 4: doctor workspace ────────────────────────────────────────────

  it("4. PATCH /api/doctor/appointments/:id clears both markers on a reschedule", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();

    const res = await app!.inject({
      method: "PATCH",
      url: `/api/doctor/appointments/${id}`,
      cookies: doctorCookie,
      payload: { scheduledAt: T2.toISOString() },
    });
    assert.equal(res.statusCode, 200, res.body);

    const row = await markers(id);
    assert.equal(row.scheduledAt?.toISOString(), T2.toISOString());
    assert.equal(row.reminderSentAt, null);
    assert.equal(row.doctorReminderSentAt, null);
  });

  // ── Atomicity ─────────────────────────────────────────────────────────────

  it("5. a failed move rolls back the marker resets with it", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();

    // `clinicId` is a real foreign key, so this write dies inside the same
    // transaction that carries the new time and the marker resets.
    await assert.rejects(() =>
      svcAppointments.scheduleAppointment(id, {
        scheduledAt: T2,
        clinicId: "clinic-that-does-not-exist",
      }),
    );

    const row = await markers(id);
    assert.equal(
      row.scheduledAt?.toISOString(),
      T1.toISOString(),
      "the move did not land…",
    );
    assert.equal(
      row.reminderSentAt?.toISOString(),
      SENT.toISOString(),
      "…so neither did the re-arm — a half-applied pair would either double-send or miss",
    );
    assert.equal(row.doctorReminderSentAt?.toISOString(), SENT.toISOString());
  });
  // ── No-show re-arm (mirrors adminUpdateAppointment) ───────────────────────

  /**
   * `doctorNoShowNotifiedAt` is the doctor-no-show cron's entry condition
   * (`doctorNoShowNotifiedAt: null` in its candidate WHERE,
   * doctor-no-show-check.service.ts). A flag stamped while the OLD doctor held
   * the appointment therefore exempts the NEW doctor from the check for good.
   *
   * A time move is the same class of defect. The flag records that the doctor
   * was checked against the start time the consultation had THEN; once it
   * starts somewhere else, that check says nothing about whether they turned
   * up, and the cron will never look at the row again. So every writer that
   * really changes `scheduledAt` clears it, doctor swap or not — and a
   * submission that changes neither leaves it standing, because re-arming an
   * unchanged consultation re-nudges a doctor who was already chased.
   */
  const NO_SHOW_WINDOW_START = () => new Date(Date.now() - 30 * 60_000);
  const NO_SHOW_WINDOW_END = () => new Date(Date.now() - 5 * 60_000);

  /** The cron's own gate, so "the new doctor's check can run" is asserted as
   *  reachability, not as a field value. */
  const isNoShowCandidate = async (id: string) =>
    (await prisma.appointment.findFirst({
      where: {
        id,
        scheduledAt: { gte: NO_SHOW_WINDOW_START(), lte: NO_SHOW_WINDOW_END() },
        doctorNoShowNotifiedAt: null,
        doctorId: { not: null },
        meetingUrl: { not: null },
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      select: { id: true },
    })) !== null;

  /** A start time `minutesAgo` in the past — inside the cron's -30..-5min window. */
  const inWindow = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);

  const mkNoShowAppointment = async (over: Record<string, unknown> = {}) =>
    mkAppointment({
      scheduledAt: inWindow(10),
      meetingUrl: "https://meet.google.com/abc-defg-hij",
      paymentStatus: "PAID",
      doctorNoShowNotifiedAt: SENT,
      ...over,
    });

  it("3d. scheduleAppointment — reassigning the doctor re-arms the no-show check", async (t) => {
    if (!boot(t)) return;
    const id = await mkNoShowAppointment();
    assert.equal(
      await isNoShowCandidate(id),
      false,
      "precondition: the OLD doctor's stamp keeps this appointment out of the cron",
    );

    await svcAppointments.scheduleAppointment(id, { doctorId: doctorBId });

    const row = await markers(id);
    assert.equal(row.doctorId, doctorBId);
    assert.equal(
      row.doctorNoShowNotifiedAt,
      null,
      "a flag stamped for the OLD doctor must not exempt the NEW one",
    );
    assert.equal(
      await isNoShowCandidate(id),
      true,
      "the newly assigned doctor's no-show check can now run",
    );
    assert.equal(row.doctorReminderSentAt, null);
    assert.equal(
      row.reminderSentAt?.toISOString(),
      SENT.toISOString(),
      "the time never moved, so the patient reminder stays delivered",
    );
  });

  it("3e. scheduleAppointment — an unchanged doctor leaves the no-show flag alone", async (t) => {
    if (!boot(t)) return;
    const id = await mkNoShowAppointment();

    await svcAppointments.scheduleAppointment(id, { doctorId: doctorAId });

    const row = await markers(id);
    assert.equal(
      row.doctorNoShowNotifiedAt?.toISOString(),
      SENT.toISOString(),
      "supplying the doctor the row already has is not a reassignment",
    );
    assert.equal(row.doctorReminderSentAt?.toISOString(), SENT.toISOString());
  });

  it("3f. scheduleAppointment — a time-only move re-arms the no-show check", async (t) => {
    if (!boot(t)) return;
    const id = await mkNoShowAppointment();
    const moved = inWindow(7);

    await svcAppointments.scheduleAppointment(id, { scheduledAt: moved });

    const row = await markers(id);
    assert.equal(row.scheduledAt?.toISOString(), moved.toISOString());
    assert.equal(row.reminderSentAt, null);
    assert.equal(row.doctorReminderSentAt, null);
    assert.equal(
      row.doctorNoShowNotifiedAt,
      null,
      "the flag says the doctor was checked against the OLD start time; the consultation now starts somewhere else and has never been checked",
    );
    assert.equal(
      await isNoShowCandidate(id),
      true,
      "the moved consultation is eligible for the no-show check at its new time",
    );
  });

  it("3g. scheduleAppointment — a simultaneous time AND doctor change clears all three", async (t) => {
    if (!boot(t)) return;
    const id = await mkNoShowAppointment();

    await svcAppointments.scheduleAppointment(id, { scheduledAt: T2, doctorId: doctorBId });

    const row = await markers(id);
    assert.equal(row.reminderSentAt, null);
    assert.equal(row.doctorReminderSentAt, null);
    assert.equal(
      row.doctorNoShowNotifiedAt,
      null,
      "the two resets are independent branches — a change that does both must clear both",
    );
  });

  // ── No-show re-arm across the other three scheduledAt writers ─────────────

  it("1c. adminUpdateAppointment — a time-only move re-arms the no-show check", async (t) => {
    if (!boot(t)) return;
    const id = await mkNoShowAppointment();
    const moved = inWindow(7);
    assert.equal(
      await isNoShowCandidate(id),
      false,
      "precondition: the stamp from the check at the OLD time keeps this row out of the cron",
    );

    await svcAdminUpdate.adminUpdateAppointment({
      appointmentId: id,
      scheduledAt: moved,
      changeReason: "patient asked to move",
    });

    const row = await markers(id);
    assert.equal(row.scheduledAt?.toISOString(), moved.toISOString());
    assert.equal(row.doctorId, doctorAId, "the doctor never changed — the time alone re-arms");
    assert.equal(row.doctorNoShowNotifiedAt, null);
    assert.equal(await isNoShowCandidate(id), true);
  });

  it("1d. adminUpdateAppointment — a combined time AND doctor change clears the flag once", async (t) => {
    if (!boot(t)) return;
    const id = await mkNoShowAppointment();
    const moved = inWindow(7);

    await svcAdminUpdate.adminUpdateAppointment({
      appointmentId: id,
      scheduledAt: moved,
      doctorId: doctorBId,
      changeReason: "moved and reassigned",
    });

    const row = await markers(id);
    assert.equal(row.doctorId, doctorBId);
    assert.equal(
      row.doctorNoShowNotifiedAt,
      null,
      "two branches both asking for null must not fight — the row ends up re-armed exactly once",
    );
    assert.equal(row.reminderSentAt, null);
    assert.equal(row.doctorReminderSentAt, null);
    assert.equal(await isNoShowCandidate(id), true);
  });

  it("1e. adminUpdateAppointment — a doctor-only swap leaves the time, and still re-arms", async (t) => {
    if (!boot(t)) return;
    const id = await mkNoShowAppointment();
    const before = await markers(id);

    await svcAdminUpdate.adminUpdateAppointment({
      appointmentId: id,
      doctorId: doctorBId,
      changeReason: "reassigned",
    });

    const row = await markers(id);
    assert.equal(
      row.scheduledAt?.toISOString(),
      before.scheduledAt?.toISOString(),
      "an unchanged time is left exactly as it was",
    );
    assert.equal(row.doctorNoShowNotifiedAt, null, "pre-existing rule, unchanged");
    assert.equal(
      await isNoShowCandidate(id),
      true,
      "the newly assigned doctor's no-show check can now run",
    );
    assert.equal(
      row.reminderSentAt?.toISOString(),
      SENT.toISOString(),
      "no time change, so the patient reminder stays delivered",
    );
  });

  it("2b. rescheduleAppointmentForPatient re-arms the no-show check with the move", async (t) => {
    if (!boot(t)) return;
    // The patient path refuses an appointment whose held time has already
    // passed (AppointmentAlreadyStartedError), so this one is in the future:
    // the property under test is the writer's re-arm rule, not cron eligibility.
    const base = new Date(Date.now() + 60 * 24 * 3600 * 1000);
    base.setUTCMinutes(0, 0, 0);
    const mkSlot = async (offsetHours: number, status: "OPEN" | "BOOKED") => {
      const startAt = new Date(base.getTime() + offsetHours * 3600 * 1000);
      const slot = await prisma.doctorTimeSlot.create({
        data: {
          doctorId: doctorAId,
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60_000),
          status,
          isAdHoc: true,
        },
      });
      slotIds.push(slot.id);
      return slot;
    };
    const oldSlot = await mkSlot(0, "BOOKED");
    const newSlot = await mkSlot(2, "OPEN");
    const id = await mkAppointment({
      userId: patientUserId,
      timeSlotId: oldSlot.id,
      scheduledAt: oldSlot.startAt,
      doctorNoShowNotifiedAt: SENT,
    });

    await svcAppointments.rescheduleAppointmentForPatient(id, patientUserId, newSlot.id);

    const row = await markers(id);
    assert.equal(row.scheduledAt?.toISOString(), newSlot.startAt.toISOString());
    assert.equal(
      row.doctorNoShowNotifiedAt,
      null,
      "this writer always moves the time (the same-slot case returns early), so it always re-arms",
    );
  });

  it("4b. PATCH /api/doctor/appointments/:id re-arms the no-show check on a move", async (t) => {
    if (!boot(t)) return;
    const id = await mkNoShowAppointment();
    const moved = inWindow(7);

    const res = await app!.inject({
      method: "PATCH",
      url: `/api/doctor/appointments/${id}`,
      cookies: doctorCookie,
      payload: { scheduledAt: moved.toISOString() },
    });
    assert.equal(res.statusCode, 200, res.body);

    const row = await markers(id);
    assert.equal(row.scheduledAt?.toISOString(), moved.toISOString());
    assert.equal(row.doctorNoShowNotifiedAt, null);
    assert.equal(await isNoShowCandidate(id), true);
  });

  it("4c. PATCH /api/doctor/appointments/:id — an unchanged time leaves the flag standing", async (t) => {
    if (!boot(t)) return;
    const id = await mkNoShowAppointment();
    const before = await markers(id);

    const res = await app!.inject({
      method: "PATCH",
      url: `/api/doctor/appointments/${id}`,
      cookies: doctorCookie,
      payload: { scheduledAt: before.scheduledAt!.toISOString() },
    });
    assert.equal(res.statusCode, 200, res.body);

    const row = await markers(id);
    assert.equal(
      row.doctorNoShowNotifiedAt?.toISOString(),
      SENT.toISOString(),
      "re-submitting the time the row already has is not a move — clearing here re-nudges a doctor already chased",
    );
    assert.equal(row.reminderSentAt?.toISOString(), SENT.toISOString());
    assert.equal(row.doctorReminderSentAt?.toISOString(), SENT.toISOString());
  });

  it("5b. a failed move rolls back the no-show re-arm with it", async (t) => {
    if (!boot(t)) return;
    const id = await mkNoShowAppointment();
    const before = await markers(id);

    await assert.rejects(() =>
      svcAppointments.scheduleAppointment(id, {
        scheduledAt: inWindow(7),
        clinicId: "clinic-that-does-not-exist",
      }),
    );

    const row = await markers(id);
    assert.equal(row.scheduledAt?.toISOString(), before.scheduledAt?.toISOString());
    assert.equal(
      row.doctorNoShowNotifiedAt?.toISOString(),
      SENT.toISOString(),
      "the move never landed, so the consultation still starts where it was checked",
    );
  });
});

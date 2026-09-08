import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { uniqueCurrencyCode } from "../../test-utils/unique-currency-code.js";

/**
 * A DoctorTimeSlot belongs to ONE doctor, so the reservation has to move when
 * the admin swaps the doctor — even though the clock time is untouched.
 *
 * The incident this pins (2026-09-08): a manual booking was moved from doctor A
 * to doctor B at the same time. The service gated its slot release/reclaim on
 * `timeChanged` alone, so the slot stayed BOOKED on A's calendar and B's hour
 * was never claimed. The public booking page went on offering B at that hour and
 * a website patient bought it — two consultations, one doctor, one hour.
 */
describe("adminUpdateAppointment — doctor swap moves the slot", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./admin-update-appointment.service.js");
  let bootError: unknown = null;

  const uniq = `swap-${Date.now()}`;
  const countryCode = `zs${Date.now()}`.slice(0, 8).toLowerCase();
  const T1 = new Date("2026-12-03T09:00:00.000Z");

  let currencyId = "";
  let countryId = "";
  let doctorAId = "";
  let doctorBId = "";
  const appointmentIds: string[] = [];

  const mkSlot = async (doctorId: string, startAt: Date, minutes: number, status: "OPEN" | "BOOKED") =>
    (
      await prisma.doctorTimeSlot.create({
        data: {
          doctorId,
          startAt,
          endAt: new Date(startAt.getTime() + minutes * 60_000),
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
        doctorId: doctorAId,
        scheduledAt: T1,
        ...over,
      },
    });
    appointmentIds.push(row.id);
    return row.id;
  };

  before(async () => {
    try {
      mock.module("./reschedule-side-effects.service.js", {
        namedExports: {
          applyRescheduleSideEffects: async () => ({
            orderId: null,
            meetingUrl: null,
            meetRegenerated: false,
            notificationsSent: true,
          }),
        },
      });
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./admin-update-appointment.service.js");
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
          name: `Swap ${uniq}`,
          slug: `swap-${uniq}`,
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
  });

  after(async () => {
    if (bootError) return;
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.doctorTimeSlot.deleteMany({
      where: { doctorId: { in: [doctorAId, doctorBId] } },
    });
    await prisma.doctor.deleteMany({ where: { id: { in: [doctorAId, doctorBId] } } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
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

  it("claims the new doctor's slot and frees the old one when only the doctor changes", async (t) => {
    if (!boot(t)) return;
    const slotA = await mkSlot(doctorAId, T1, 15, "BOOKED");
    await mkSlot(doctorBId, T1, 15, "OPEN");
    const id = await mkAppointment({ timeSlotId: slotA });

    await svc.adminUpdateAppointment({
      appointmentId: id,
      doctorId: doctorBId,
      changeReason: "doctor a is not available",
    });

    const row = await prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: { doctorId: true, timeSlot: { select: { doctorId: true, startAt: true, status: true } } },
    });
    assert.equal(row.doctorId, doctorBId);
    assert.ok(row.timeSlot, "the appointment must still be backed by a reservation");
    assert.equal(
      row.timeSlot.doctorId,
      doctorBId,
      "the reservation must sit on the NEW doctor's calendar — otherwise their hour stays on sale",
    );
    assert.equal(row.timeSlot.startAt.toISOString(), T1.toISOString());
    assert.equal(row.timeSlot.status, "BOOKED");

    const staleOnA = await prisma.doctorTimeSlot.findFirst({
      where: { doctorId: doctorAId, startAt: T1, status: "BOOKED" },
      select: { id: true },
    });
    assert.equal(staleOnA, null, "the old doctor's hour must be given back");
  });

  it("refuses the swap when the new doctor's hour is already taken", async (t) => {
    if (!boot(t)) return;
    const slotA = await mkSlot(doctorAId, T1, 15, "BOOKED");
    const takenOnB = await mkSlot(doctorBId, T1, 15, "BOOKED");
    const other = await mkAppointment({ doctorId: doctorBId, timeSlotId: takenOnB });
    const id = await mkAppointment({ timeSlotId: slotA });

    await assert.rejects(
      svc.adminUpdateAppointment({
        appointmentId: id,
        doctorId: doctorBId,
        changeReason: "doctor a is not available",
      }),
      svc.TargetSlotUnavailableError,
    );

    // Rejected up front: nothing may have been released or rewritten.
    const row = await prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: { doctorId: true, timeSlotId: true },
    });
    assert.equal(row.doctorId, doctorAId);
    assert.equal(row.timeSlotId, slotA, "a refused move must not strip the existing reservation");

    const otherRow = await prisma.appointment.findUniqueOrThrow({
      where: { id: other },
      select: { timeSlotId: true },
    });
    assert.equal(otherRow.timeSlotId, takenOnB);
  });
});

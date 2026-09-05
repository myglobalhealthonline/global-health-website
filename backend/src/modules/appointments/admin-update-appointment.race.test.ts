import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import { uniqueCurrencyCode } from "../../test-utils/unique-currency-code.js";

/**
 * `adminUpdateAppointment` decides which 24h reminder markers to clear from a
 * diff computed against a row it read BEFORE the transaction — and before
 * doctor validation, the previous-slot read and the slot release, each of
 * which is its own database round trip. A concurrent move landing in that
 * window makes the diff describe a change that is no longer the one being
 * applied.
 *
 * The failure that costs a patient their reminder:
 *   - the row reads `scheduledAt = T1`, `doctorId = A`
 *   - an admin submits `{ scheduledAt: T1, doctorId: B }` — a doctor swap, and
 *     `timeChanged` is false because T1 is what they just read on screen
 *   - meanwhile another writer moves the consultation to T2, and the reminder
 *     for T2 is delivered (`reminderSentAt` stamped)
 *   - the update lands `scheduledAt = T1`. The time really did change (T2 → T1)
 *     but the stale diff said it did not, so `reminderSentAt` is left standing.
 *
 * Nothing ever revisits that row: the marker means "delivered", the enqueue
 * scan skips it, and the patient's only reminder named a time that no longer
 * exists.
 *
 * The mirror-image defect is a marker cleared for a change that did NOT happen
 * (the admin submits the doctor the row already has, by way of a concurrent
 * write), which re-rings a doctor who was already told.
 *
 * DB-backed with a deterministic interleave: `prisma.appointment.findUnique` is
 * wrapped so exactly one armed concurrent write fires immediately after the
 * service's own pre-transaction read returns. Real transactions, real
 * rollbacks — only the timing is injected.
 */
describe("adminUpdateAppointment — stale pre-transaction diff", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let adminUpdateAppointment: (typeof import("./admin-update-appointment.service.js"))["adminUpdateAppointment"];
  let bootError: unknown = null;

  const uniq = `race-${Date.now()}`;
  const countryCode = `zc${Date.now()}`.slice(0, 8).toLowerCase();

  let currencyId = "";
  let countryId = "";
  let doctorAId = "";
  let doctorBId = "";
  let doctorCId = "";
  let doctorDoomedId = "";
  const appointmentIds: string[] = [];

  /** Fires once, immediately after the service's pre-transaction row read. */
  let armed: (() => Promise<void>) | null = null;
  /** Appointment the arm belongs to, so a read of any other row can't spend it. */
  let armedFor: string | null = null;
  let originalFindUnique: ((args: unknown) => Promise<unknown>) | null = null;
  let originalUpdate: ((args: unknown) => Promise<unknown>) | null = null;
  /** How many times a slot was detached (`releaseAppointmentSlot`'s write). */
  let slotReleases = 0;
  const sideEffectCalls: Record<string, unknown>[] = [];

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

  const readBack = async (id: string) =>
    prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: {
        scheduledAt: true,
        doctorId: true,
        reminderSentAt: true,
        doctorReminderSentAt: true,
        doctorNoShowNotifiedAt: true,
        timeSlotId: true,
      },
    });

  before(async () => {
    try {
      mock.module("./reschedule-side-effects.service.js", {
        namedExports: {
          applyRescheduleSideEffects: async (input: Record<string, unknown>) => {
            sideEffectCalls.push(input);
            return {
              orderId: null,
              meetingUrl: null,
              meetRegenerated: false,
              notificationsSent: true,
            };
          },
        },
      });
      prisma = (await import("../../db/prisma.js")).prisma;
      adminUpdateAppointment = (await import("./admin-update-appointment.service.js"))
        .adminUpdateAppointment;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
      return;
    }

    // Deterministic interleave: run the armed writer the instant the service's
    // own pre-transaction read has returned its (now stale) snapshot.
    const apptDelegate = prisma.appointment as unknown as Record<string, unknown>;
    originalFindUnique = (apptDelegate.findUnique as (a: unknown) => Promise<unknown>).bind(
      prisma.appointment,
    );
    apptDelegate.findUnique = async (args: unknown) => {
      const result = await originalFindUnique!(args);
      const readId = (args as { where?: { id?: unknown } } | undefined)?.where?.id;
      if (armed && readId === armedFor) {
        const fire = armed;
        armed = null;
        armedFor = null;
        await fire();
      }
      return result;
    };
    // `releaseAppointmentSlot` is the only writer that detaches a slot, and it
    // does so with `data: { timeSlotId: null }` — count those to prove the
    // release is not duplicated.
    originalUpdate = (apptDelegate.update as (a: unknown) => Promise<unknown>).bind(
      prisma.appointment,
    );
    apptDelegate.update = async (args: unknown) => {
      const data = (args as { data?: { timeSlotId?: unknown } }).data;
      if (data && "timeSlotId" in data && data.timeSlotId === null) slotReleases++;
      return originalUpdate!(args);
    };

    currencyId = (
      await prisma.currency.create({
        data: { code: uniqueCurrencyCode(), symbol: "€", decimals: 2 },
      })
    ).id;
    countryId = (
      await prisma.country.create({
        data: {
          code: countryCode,
          name: `Race ${uniq}`,
          slug: `race-${uniq}`,
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
    doctorCId = await mkDoctor("c");
    doctorDoomedId = await mkDoctor("doomed");
  });

  after(async () => {
    const apptDelegate = prisma?.appointment as unknown as Record<string, unknown>;
    if (originalFindUnique) apptDelegate.findUnique = originalFindUnique;
    if (originalUpdate) apptDelegate.update = originalUpdate;
    if (bootError) return;
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.doctorTimeSlot.deleteMany({
      where: { doctorId: { in: [doctorAId, doctorBId, doctorCId] } },
    });
    await prisma.doctor.deleteMany({
      where: { id: { in: [doctorAId, doctorBId, doctorCId, doctorDoomedId] } },
    });
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

  it("1. a concurrent time change still clears BOTH markers", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();
    // Another writer moves the consultation to T2 and its reminder is delivered.
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

    // The admin's form still shows T1, so `scheduledAt` reads as "unchanged"
    // against the stale snapshot while really moving the row T2 → T1.
    await adminUpdateAppointment({
      appointmentId: id,
      scheduledAt: T1,
      doctorId: doctorBId,
      changeReason: "swap doctor",
    });

    const row = await readBack(id);
    assert.equal(
      row.scheduledAt?.toISOString(),
      T1.toISOString(),
      "the write really did change the consultation's time",
    );
    assert.equal(
      row.reminderSentAt,
      null,
      "the time this write actually changed must re-arm the patient reminder — a standing marker means the reminder is missed permanently",
    );
    assert.equal(row.doctorReminderSentAt, null);
  });

  it("2. a concurrent doctor change clears ONLY the doctor marker", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();
    armedFor = id;
    armed = async () => {
      await prisma.appointment.update({
        where: { id },
        data: { doctorId: doctorBId, doctorReminderSentAt: DELIVERED_LATER },
      });
    };

    await adminUpdateAppointment({
      appointmentId: id,
      doctorId: doctorCId,
      changeReason: "reassign again",
    });

    const row = await readBack(id);
    assert.equal(row.doctorId, doctorCId);
    assert.equal(row.doctorReminderSentAt, null, "the newly assigned doctor has heard nothing");
    assert.equal(row.doctorNoShowNotifiedAt, null);
    assert.equal(
      row.reminderSentAt?.toISOString(),
      SENT.toISOString(),
      "the time never moved, so the patient must not be emailed twice",
    );
    assert.equal(row.scheduledAt?.toISOString(), T1.toISOString());
  });

  it("3. a change the row already has re-arms nothing", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();
    // Someone else assigned the very doctor this admin is about to submit, and
    // that doctor has already been notified.
    armedFor = id;
    armed = async () => {
      await prisma.appointment.update({
        where: { id },
        data: { doctorId: doctorCId, doctorReminderSentAt: DELIVERED_LATER },
      });
    };

    await adminUpdateAppointment({
      appointmentId: id,
      doctorId: doctorCId,
      changeReason: "reassign",
    });

    const row = await readBack(id);
    assert.equal(row.doctorId, doctorCId);
    assert.equal(
      row.doctorReminderSentAt?.toISOString(),
      DELIVERED_LATER.toISOString(),
      "supplying a field is not a change — clearing the marker here re-rings a doctor who was already told",
    );
    assert.equal(row.reminderSentAt?.toISOString(), SENT.toISOString());
  });

  it("4. a failed transaction rolls back the move AND the marker resets", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();
    const before = await readBack(id);
    sideEffectCalls.length = 0;

    // Delete the target doctor AFTER validation passes but before the write, so
    // the update dies on the foreign key inside the transaction.
    const orderItemDelegate = prisma.orderItem as unknown as Record<string, unknown>;
    const realFindFirst = (
      orderItemDelegate.findFirst as (a: unknown) => Promise<unknown>
    ).bind(prisma.orderItem);
    orderItemDelegate.findFirst = async (args: unknown) => {
      const result = await realFindFirst(args);
      orderItemDelegate.findFirst = realFindFirst;
      await prisma.doctor.delete({ where: { id: doctorDoomedId } });
      return result;
    };
    await assert.rejects(() =>
      adminUpdateAppointment({
        appointmentId: id,
        scheduledAt: T2,
        doctorId: doctorDoomedId,
        changeReason: "doomed",
      }),
    );
    orderItemDelegate.findFirst = realFindFirst;

    const row = await readBack(id);
    assert.equal(row.scheduledAt?.toISOString(), before.scheduledAt?.toISOString());
    assert.equal(row.doctorId, before.doctorId);
    assert.equal(
      row.reminderSentAt?.toISOString(),
      SENT.toISOString(),
      "a half-applied pair would either double-send or miss",
    );
    assert.equal(row.doctorReminderSentAt?.toISOString(), SENT.toISOString());
    assert.equal(sideEffectCalls.length, 0, "no notification for a move that never landed");
  });

  it("5. an ordinary reschedule is unchanged, releasing the slot and notifying once", async (t) => {
    if (!boot(t)) return;
    const start = new Date(Date.now() + 45 * 24 * 3600 * 1000);
    start.setUTCMinutes(0, 0, 0);
    const slot = await prisma.doctorTimeSlot.create({
      data: {
        doctorId: doctorAId,
        startAt: start,
        endAt: new Date(start.getTime() + 30 * 60_000),
        status: "BOOKED",
        isAdHoc: true,
      },
    });
    const id = await mkAppointment({ scheduledAt: start, timeSlotId: slot.id });
    slotReleases = 0;
    sideEffectCalls.length = 0;

    const result = await adminUpdateAppointment({
      appointmentId: id,
      scheduledAt: T2,
      changeReason: "patient asked to move",
    });

    const row = await readBack(id);
    assert.equal(row.scheduledAt?.toISOString(), T2.toISOString());
    assert.equal(row.doctorId, doctorAId, "a time-only move leaves the doctor alone");
    assert.equal(row.reminderSentAt, null);
    assert.equal(row.doctorReminderSentAt, null);
    assert.equal(slotReleases, 1, "the old slot is detached exactly once");
    assert.equal(sideEffectCalls.length, 1, "exactly one notification pass");
    assert.equal(sideEffectCalls[0]!.timeChanged, true);
    assert.equal(sideEffectCalls[0]!.doctorChanged, false);
    assert.equal(result.appointment.id, id);
    assert.equal(result.notificationsSent, true);
    assert.equal(result.orderId, null);
  });

  /**
   * `doctorNoShowNotifiedAt` re-arms on a real time change too, so it is
   * subject to the same stale-diff hazard as the reminder markers — and this
   * is the direction that discriminates. The opposite one (stale says
   * "unchanged", the write really moves the row) cannot be staged on its own:
   * `hasChanges` is computed from the same stale diff, so a submission it
   * reads as unchanged is rejected before any write, and admitting it needs a
   * doctor change — which clears the flag by its own rule and hides the bug.
   * Test 1 covers that direction for the reminder markers.
   */
  it("7. a time the row already carries leaves the no-show flag standing", async (t) => {
    if (!boot(t)) return;
    // The doctor was checked, and chased, while the consultation stood at T2.
    const id = await mkAppointment({ doctorNoShowNotifiedAt: SENT });
    // Someone else has already moved it to the very time this admin submits.
    armedFor = id;
    armed = async () => {
      await prisma.appointment.update({ where: { id }, data: { scheduledAt: T2 } });
    };

    await adminUpdateAppointment({
      appointmentId: id,
      scheduledAt: T2,
      changeReason: "move",
    });

    const row = await readBack(id);
    assert.equal(row.scheduledAt?.toISOString(), T2.toISOString());
    assert.equal(
      row.doctorNoShowNotifiedAt?.toISOString(),
      SENT.toISOString(),
      "the stale diff calls this a move, but the write changes nothing — re-arming off it would chase a doctor who was already chased about this very start time",
    );
  });

  it("6. an unchanged submission is still rejected before any write", async (t) => {
    if (!boot(t)) return;
    const id = await mkAppointment();
    sideEffectCalls.length = 0;

    await assert.rejects(
      () =>
        adminUpdateAppointment({
          appointmentId: id,
          scheduledAt: T1,
          doctorId: doctorAId,
          changeReason: "no-op",
        }),
      /No changes to apply/,
    );

    const row = await readBack(id);
    assert.equal(row.reminderSentAt?.toISOString(), SENT.toISOString());
    assert.equal(row.doctorReminderSentAt?.toISOString(), SENT.toISOString());
    assert.equal(sideEffectCalls.length, 0);
  });
});

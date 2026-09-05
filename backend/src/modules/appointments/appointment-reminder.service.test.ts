import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * 24h appointment reminders — enqueue scan and per-row dispatch.
 *
 * The two failures this suite exists to prevent:
 *   1. A doctor-only reassignment keeps the appointment id AND the start time,
 *      so a doctor reminder key built from those two alone collides with the
 *      row already sent to the OLD doctor: the new doctor is never told, and a
 *      stale row can still ring the old one. The key and the payload carry the
 *      doctor id, and dispatch re-checks it.
 *   2. A page cap ("take: 100") silently starves everything behind the first
 *      hundred rows of the window, forever, because the earliest rows come back
 *      first on every scan. Keyset paging drains the whole window instead.
 *
 * Fully mocked — zero DB, SMTP or notification contact (needs
 * `--experimental-test-module-mocks`).
 */

type Row = Record<string, unknown>;

const state: {
  pages: Row[][];
  findManyArgs: Record<string, unknown>[];
  enqueued: Row[];
  appointment: Row | null;
  emailCalls: Row[];
  notifyCalls: { doctorId: string; payload: Row; hasClient: boolean }[];
  updateManyCalls: Record<string, unknown>[];
  txLog: string[];
  country: Row | null;
  emailOk: boolean;
} = {
  pages: [],
  findManyArgs: [],
  enqueued: [],
  appointment: null,
  emailCalls: [],
  notifyCalls: [],
  updateManyCalls: [],
  txLog: [],
  country: null,
  emailOk: true,
};

let svc: typeof import("./appointment-reminder.service.js");

const APPT = "appt-1";
const DOCTOR_OLD = "doc-old";
const DOCTOR_NEW = "doc-new";
const START = new Date("2026-09-06T09:00:00.000Z");

before(async () => {
  const txClient = {
    appointment: {
      updateMany: async (args: Record<string, unknown>) => {
        state.txLog.push("stamp");
        state.updateManyCalls.push(args);
        return { count: 1 };
      },
    },
    user: { findFirst: async () => ({ id: "user-1" }) },
    notification: { create: async () => ({ id: "notif-1" }) },
  };

  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        appointment: {
          findMany: async (args: Record<string, unknown>) => {
            state.findManyArgs.push(args);
            return state.pages.shift() ?? [];
          },
          findFirst: async () => state.appointment,
          updateMany: async (args: Record<string, unknown>) => {
            state.updateManyCalls.push(args);
            return { count: 1 };
          },
        },
        outbox: {
          createMany: async (args: { data: Row[] }) => {
            state.enqueued.push(...args.data);
            return { count: args.data.length };
          },
        },
        country: { findFirst: async () => state.country },
        $transaction: async (fn: (tx: typeof txClient) => Promise<void>) => {
          state.txLog.push("tx:start");
          await fn(txClient);
          state.txLog.push("tx:end");
        },
      },
    },
  });

  mock.module("../../lib/email/templates.js", {
    namedExports: {
      sendAppointmentReminderEmail: async (args: Row) => {
        state.emailCalls.push(args);
        return state.emailOk
          ? { ok: true, id: "msg-1", mode: "smtp" }
          : { ok: false, mode: "smtp", message: "SMTP rejected recipient: patient@example.test" };
      },
    },
  });

  mock.module("../notifications/notify.service.js", {
    namedExports: {
      notifyDoctor: async (
        doctorId: string,
        _type: string,
        payload: Row,
        client?: unknown,
      ) => {
        state.txLog.push("notify");
        state.notifyCalls.push({ doctorId, payload, hasClient: client !== undefined });
      },
    },
  });

  svc = await import("./appointment-reminder.service.js");
});

beforeEach(() => {
  state.pages = [];
  state.findManyArgs = [];
  state.enqueued = [];
  state.appointment = null;
  state.emailCalls = [];
  state.notifyCalls = [];
  state.updateManyCalls = [];
  state.txLog = [];
  state.country = null;
  state.emailOk = true;
});

const candidate = (over: Partial<Row> = {}): Row => ({
  id: APPT,
  scheduledAt: START,
  doctorId: DOCTOR_OLD,
  reminderSentAt: null,
  doctorReminderSentAt: null,
  meetingUrl: "https://meet.example/x",
  clinicId: null,
  locationAddress: null,
  ...over,
});

// ── Keys ────────────────────────────────────────────────────────────────────

describe("reminder idempotency keys", () => {
  it("keys the doctor reminder on the doctor as well as the appointment + time", () => {
    const forOld = svc.doctorReminderKey(APPT, START, DOCTOR_OLD);
    const forNew = svc.doctorReminderKey(APPT, START, DOCTOR_NEW);
    assert.notEqual(
      forOld,
      forNew,
      "a doctor-only reassignment keeps the id and the time — without the doctor id the new doctor's row collides with the old doctor's and is never sent",
    );
    assert.equal(
      forOld,
      `appointment_reminder_doctor_24h:${APPT}:${START.toISOString()}:${DOCTOR_OLD}`,
    );
  });

  it("keys the patient reminder on the appointment + expected time only", () => {
    assert.equal(
      svc.patientReminderKey(APPT, START),
      `appointment_reminder_patient_24h:${APPT}:${START.toISOString()}`,
    );
    // A time move mints a different key, so the stale row retires on its own.
    assert.notEqual(
      svc.patientReminderKey(APPT, START),
      svc.patientReminderKey(APPT, new Date(START.getTime() + 3_600_000)),
    );
  });
});

// ── Enqueue ─────────────────────────────────────────────────────────────────

describe("enqueueDueAppointmentReminders", () => {
  it("queues one patient row and one doctor row, carrying only internal identifiers", async () => {
    state.pages = [[candidate()]];
    const result = await svc.enqueueDueAppointmentReminders(new Date("2026-09-05T09:00:00.000Z"));

    assert.equal(result.patientQueued, 1);
    assert.equal(result.doctorQueued, 1);
    assert.equal(state.enqueued.length, 2);

    const patient = state.enqueued.find(
      (r) => r.kind === "appointment_reminder_patient_24h",
    )!;
    const doctor = state.enqueued.find((r) => r.kind === "appointment_reminder_doctor_24h")!;
    assert.deepEqual(Object.keys(patient.payload as Row).sort(), [
      "appointmentId",
      "expectedScheduledAt",
    ]);
    assert.deepEqual(Object.keys(doctor.payload as Row).sort(), [
      "appointmentId",
      "expectedDoctorId",
      "expectedScheduledAt",
    ]);
    // No names, emails, phone numbers, dates of birth, addresses or medical
    // detail may ride along in the payload.
    const serialised = JSON.stringify(state.enqueued);
    for (const leaked of ["email", "fullName", "phone", "dateOfBirth", "notes", "snippet"]) {
      assert.ok(!serialised.includes(leaked), `payload must not carry ${leaked}`);
    }
    assert.equal((doctor.payload as Row).expectedDoctorId, DOCTOR_OLD);
  });

  it("skips an audience whose reminder is already delivered", async () => {
    state.pages = [[candidate({ reminderSentAt: new Date(), doctorReminderSentAt: null })]];
    const result = await svc.enqueueDueAppointmentReminders();
    assert.equal(result.patientQueued, 0);
    assert.equal(result.doctorQueued, 1);
  });

  it("skips the patient row when we cannot say how to attend, and the doctor row with no doctor", async () => {
    state.pages = [[candidate({ meetingUrl: null, clinicId: null, locationAddress: null, doctorId: null })]];
    const result = await svc.enqueueDueAppointmentReminders();
    assert.equal(result.patientQueued, 0);
    assert.equal(result.doctorQueued, 0);
    assert.equal(state.enqueued.length, 0);
  });

  it("gates on payment and on live status", async () => {
    state.pages = [[]];
    await svc.enqueueDueAppointmentReminders();
    const where = state.findManyArgs[0]!.where as Record<string, unknown>;
    assert.deepEqual(where.status, { notIn: ["CANCELLED", "COMPLETED"] });
    const and = where.AND as Record<string, unknown>[];
    assert.ok(and[0]!.OR, "the paid-appointment gate is AND-ed into the scan");
  });

  it("pages by (scheduledAt, id) so equal start times cannot starve later rows", async () => {
    const sameTime = new Date("2026-09-06T10:00:00.000Z");
    const first = Array.from({ length: 200 }, (_, i) =>
      candidate({ id: `a-${String(i).padStart(3, "0")}`, scheduledAt: sameTime }),
    );
    const second = [candidate({ id: "b-000", scheduledAt: sameTime })];
    state.pages = [first, second];

    const result = await svc.enqueueDueAppointmentReminders();

    assert.equal(state.findManyArgs.length, 2, "a full page is followed by another read");
    const firstArgs = state.findManyArgs[0]!;
    assert.deepEqual(firstArgs.orderBy, [{ scheduledAt: "asc" }, { id: "asc" }]);
    assert.equal(
      (firstArgs.where as Record<string, unknown>).AND instanceof Array &&
        ((firstArgs.where as { AND: unknown[] }).AND.length as number),
      1,
      "the first page carries no keyset clause",
    );

    const keyset = ((state.findManyArgs[1]!.where as { AND: Record<string, unknown>[] })
      .AND[1] as { OR: Record<string, unknown>[] }).OR;
    assert.deepEqual(keyset[0], { scheduledAt: { gt: sameTime } });
    assert.deepEqual(
      keyset[1],
      { scheduledAt: sameTime, id: { gt: "a-199" } },
      "rows sharing a start time advance on the unique id tie-breaker",
    );
    assert.equal(result.scanned, 201, "every candidate past the first page is drained");
  });

  it("stops as soon as a short page comes back", async () => {
    state.pages = [[candidate()], [candidate({ id: "never-read" })]];
    await svc.enqueueDueAppointmentReminders();
    assert.equal(state.findManyArgs.length, 1);
  });
});

// ── Patient dispatch ────────────────────────────────────────────────────────

const patientRow = (over: Partial<Row> = {}): Row => ({
  id: APPT,
  email: "patient@example.test",
  fullName: "Test Patient",
  consultationType: "GENERAL",
  scheduledAt: START,
  reminderSentAt: null,
  meetingUrl: "https://meet.example/x",
  consultationMode: "ONLINE",
  locationAddress: null,
  clinic: null,
  doctor: { fullName: "Ana Silva" },
  ...over,
});

const patientPayload = (over: Partial<Row> = {}) => ({
  appointmentId: APPT,
  expectedScheduledAt: START.toISOString(),
  ...over,
});

describe("dispatchPatientAppointmentReminder", () => {
  it("sends the email, then stamps reminderSentAt guarded on it still being null", async () => {
    state.appointment = patientRow();
    await svc.dispatchPatientAppointmentReminder(patientPayload());

    assert.equal(state.emailCalls.length, 1);
    assert.equal(state.emailCalls[0]!.to, "patient@example.test");
    assert.deepEqual(state.updateManyCalls[0]!.where, { id: APPT, reminderSentAt: null });
  });

  it("is a silent no-op when the appointment moved after the row was queued", async () => {
    state.appointment = patientRow({ scheduledAt: new Date("2026-09-06T15:00:00.000Z") });
    await svc.dispatchPatientAppointmentReminder(patientPayload());
    assert.equal(state.emailCalls.length, 0);
    assert.equal(state.updateManyCalls.length, 0);
  });

  it("is a no-op when the reminder is already delivered, or the row is gone/ineligible", async () => {
    state.appointment = patientRow({ reminderSentAt: new Date() });
    await svc.dispatchPatientAppointmentReminder(patientPayload());
    assert.equal(state.emailCalls.length, 0);

    state.appointment = null; // cancelled, refunded or deleted — findFirst misses
    await svc.dispatchPatientAppointmentReminder(patientPayload());
    assert.equal(state.emailCalls.length, 0);
  });

  it("does not email an IN_PERSON booking with nowhere to go", async () => {
    state.appointment = patientRow({
      consultationMode: "IN_PERSON",
      meetingUrl: null,
      locationAddress: null,
      clinic: null,
    });
    await svc.dispatchPatientAppointmentReminder(patientPayload());
    assert.equal(state.emailCalls.length, 0);
  });

  it("retries instead of stamping when the provider rejects the delivery", async () => {
    // `sendEmail` reports a failed send as `{ ok: false }` rather than throwing,
    // so an unchecked result would mark a reminder nobody received as sent.
    state.appointment = patientRow();
    state.emailOk = false;
    await assert.rejects(
      () => svc.dispatchPatientAppointmentReminder(patientPayload()),
      (err: Error) => {
        assert.equal(
          err.message,
          "appointment_reminder_patient_24h: email delivery failed",
          "the provider's own message names the recipient and would land in Outbox.lastError",
        );
        assert.ok(!err.message.includes("patient@example.test"));
        return true;
      },
    );
    assert.equal(state.updateManyCalls.length, 0, "reminderSentAt is not stamped");
  });

  it("rejects a malformed payload without echoing any identifier into the error", async () => {
    await assert.rejects(
      () => svc.dispatchPatientAppointmentReminder({ appointmentId: APPT }),
      (err: Error) => {
        assert.equal(err.message, "appointment_reminder_patient_24h: invalid payload");
        assert.ok(!err.message.includes(APPT));
        return true;
      },
    );
  });
});

// ── Doctor dispatch ─────────────────────────────────────────────────────────

const doctorRow = (over: Partial<Row> = {}): Row => ({
  id: APPT,
  fullName: "Test Patient",
  doctorId: DOCTOR_OLD,
  doctorReminderSentAt: null,
  scheduledAt: START,
  meetingUrl: "https://meet.example/x",
  countryCode: "ie",
  service: { country: { bookingSetting: { timezone: "Europe/Dublin" } } },
  doctor: { country: { bookingSetting: { timezone: "Europe/Dublin" } } },
  ...over,
});

const doctorPayload = (doctorId: string, over: Partial<Row> = {}) => ({
  appointmentId: APPT,
  expectedScheduledAt: START.toISOString(),
  expectedDoctorId: doctorId,
  ...over,
});

describe("dispatchDoctorAppointmentReminder", () => {
  it("notifies the doctor and stamps the marker inside ONE transaction", async () => {
    state.appointment = doctorRow();
    await svc.dispatchDoctorAppointmentReminder(doctorPayload(DOCTOR_OLD));

    assert.equal(state.notifyCalls.length, 1);
    assert.equal(state.notifyCalls[0]!.doctorId, DOCTOR_OLD);
    assert.equal(
      state.notifyCalls[0]!.hasClient,
      true,
      "the bell is written on the transaction client, not the shared one",
    );
    assert.deepEqual(
      state.txLog,
      ["tx:start", "notify", "stamp", "tx:end"],
      "a crash between the notification and the marker would otherwise leave a duplicate bell",
    );
    assert.deepEqual(state.updateManyCalls[0]!.where, {
      id: APPT,
      doctorReminderSentAt: null,
    });
  });

  it("retires the OLD doctor's row as a no-op after a reassignment", async () => {
    // Same appointment, same time, different doctor — the exact case a key
    // without the doctor id could not distinguish.
    state.appointment = doctorRow({ doctorId: DOCTOR_NEW });
    await svc.dispatchDoctorAppointmentReminder(doctorPayload(DOCTOR_OLD));

    assert.equal(state.notifyCalls.length, 0, "the old doctor must never be notified");
    assert.equal(state.txLog.length, 0);
    assert.equal(state.updateManyCalls.length, 0);
  });

  it("notifies only the newly assigned doctor", async () => {
    state.appointment = doctorRow({ doctorId: DOCTOR_NEW });
    await svc.dispatchDoctorAppointmentReminder(doctorPayload(DOCTOR_NEW));

    assert.equal(state.notifyCalls.length, 1);
    assert.equal(state.notifyCalls[0]!.doctorId, DOCTOR_NEW);
  });

  it("is a no-op on a stale time, or once the marker is already stamped", async () => {
    state.appointment = doctorRow({ scheduledAt: new Date("2026-09-06T15:00:00.000Z") });
    await svc.dispatchDoctorAppointmentReminder(doctorPayload(DOCTOR_OLD));
    assert.equal(state.notifyCalls.length, 0);

    state.appointment = doctorRow({ doctorReminderSentAt: new Date() });
    await svc.dispatchDoctorAppointmentReminder(doctorPayload(DOCTOR_OLD));
    assert.equal(state.notifyCalls.length, 0);
  });

  it("keeps patient-identifying text out of the payload it was handed, carrying it only in the bell", async () => {
    state.appointment = doctorRow();
    await svc.dispatchDoctorAppointmentReminder(doctorPayload(DOCTOR_OLD));
    const snippet = String((state.notifyCalls[0]!.payload as Row).snippet);
    assert.ok(snippet.includes("Test Patient"), "the in-portal bell still reads normally");
    // …and none of that came from the outbox row.
    assert.ok(!JSON.stringify(doctorPayload(DOCTOR_OLD)).includes("Test Patient"));
  });

  it("rejects a payload missing the expected doctor without echoing identifiers", async () => {
    await assert.rejects(
      () =>
        svc.dispatchDoctorAppointmentReminder({
          appointmentId: APPT,
          expectedScheduledAt: START.toISOString(),
        }),
      (err: Error) => {
        assert.equal(err.message, "appointment_reminder_doctor_24h: invalid payload");
        assert.ok(!err.message.includes(APPT));
        return true;
      },
    );
  });
});

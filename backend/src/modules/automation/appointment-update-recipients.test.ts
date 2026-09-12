import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * Who actually hears about a rescheduled consultation.
 *
 * The reported failure: an admin moved a PAID consultation, the patient got
 * their branded schedule email, and the assigned doctor was told nothing at
 * all — no email, no WhatsApp — so they sat on the old time. The admin
 * appointment form deliberately skips the shared `applyRescheduleSideEffects`
 * (it supplies the meeting link itself and sends its own patient email), and
 * that also silently dropped every doctor and admin channel with it.
 *
 * `skipPatient` exists for exactly that caller: suppress the duplicate patient
 * copy, keep the doctor and admin ones. These tests pin both shapes, paid and
 * unpaid.
 *
 * Fully mocked — zero DB, email or WhatsApp contact (needs
 * `--experimental-test-module-mocks`).
 */

type Row = Record<string, unknown> | null;

const state: {
  order: Row;
  appointment: Row;
  emails: { to: string; subject: string }[];
  whatsapps: { to: string; message: string }[];
  runs: Record<string, unknown>[];
  adminAlerts: string[];
} = {
  order: null,
  appointment: null,
  emails: [],
  whatsapps: [],
  runs: [],
  adminAlerts: [],
};

let svc: typeof import("./appointment-update-notifications.service.js");

const ORDER_ID = "order-1";
const APPT_ID = "appt-1";
const DOCTOR_ID = "doc-1";
const PATIENT_EMAIL = "patient@example.com";
const PATIENT_PHONE = "+353871234567";
const DOCTOR_EMAIL = "doctor@example.com";
const DOCTOR_PHONE = "+353879999999";
const NEW_START = new Date("2026-11-01T10:00:00.000Z");

/** Automation runs the service recorded as actually sent (not SKIPPED). */
const sentKeys = () =>
  state.runs
    .filter((r) => r.status !== "SKIPPED")
    .map((r) => r.automationKey as string);
const skippedKeys = () =>
  state.runs
    .filter((r) => r.status === "SKIPPED")
    .map((r) => r.automationKey as string);

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        order: { findUnique: async () => state.order },
        appointment: { findUnique: async () => state.appointment },
      },
    },
  });
  mock.module("../../lib/whatsapp/resolve-doctor-contact.js", {
    namedExports: {
      resolveDoctorContact: async (doctorId: string | null) =>
        doctorId
          ? {
              fullName: "Robert Gabriel Brindus",
              title: "GP",
              whatsappNumber: DOCTOR_PHONE,
              whatsappRaw: DOCTOR_PHONE,
              whatsappHints: {},
              loginEmail: DOCTOR_EMAIL,
            }
          : null,
      formatDoctorDisplayName: (c: { fullName: string }) => `Dr ${c.fullName}`,
    },
  });
  mock.module("../../lib/whatsapp/wasender.js", {
    namedExports: {
      sendWhatsAppText: async (msg: { to: string; message: string }) => {
        state.whatsapps.push({ to: msg.to, message: msg.message });
        return { ok: true, to: msg.to };
      },
      formatWhatsAppSendError: (e: unknown) => String(e),
    },
  });
  mock.module("./send-automation-notification.js", {
    namedExports: {
      sendAutomationEmail: async (msg: { to: string; subject: string }) => {
        state.emails.push({ to: msg.to, subject: msg.subject });
        return { ok: true };
      },
    },
  });
  mock.module("./automation-run.service.js", {
    namedExports: {
      createAutomationRun: async (run: Record<string, unknown>) => {
        state.runs.push(run);
        return { id: `run-${state.runs.length}` };
      },
      finishAutomationRun: async () => undefined,
    },
  });
  mock.module("./admin-booking-alert.service.js", {
    namedExports: {
      sendAdminBookingAlert: async (orderId: string) => {
        state.adminAlerts.push(orderId);
      },
    },
  });
  mock.module("../orders/order-payment-url.service.js", {
    namedExports: { resolveOrderPaymentUrl: async () => "https://pay.example/abc" },
  });
  mock.module("./staff-timezone.js", {
    namedExports: { resolveStaffTimeZone: async () => "Europe/Dublin" },
  });
  mock.module("../../lib/email/resolve-email-logo-url.js", {
    namedExports: {
      resolveEmailLogoUrl: async () => "https://cdn.example/logo.png",
      DEFAULT_EMAIL_LOGO_PATH: "/logo.png",
    },
  });
  svc = await import("./appointment-update-notifications.service.js");
});

const setOrder = (over: Record<string, unknown> = {}) => {
  state.order = {
    id: ORDER_ID,
    orderNumber: "ORD-000382",
    email: PATIENT_EMAIL,
    phone: PATIENT_PHONE,
    fullName: "Jonathan Dahle",
    countryCode: "ie",
    notificationLocale: null,
    totalCents: 4500,
    currencyCode: "EUR",
    status: "PAID",
    paymentDueAt: null,
    meetingUrl: "https://meet.example/new",
    items: [
      {
        id: "item-1",
        name: "General consultation",
        serviceId: "svc-1",
        appointmentId: APPT_ID,
        patientFullName: "Jonathan Dahle",
        patientTimezone: "Europe/Dublin",
        patientWhatsappConsent: true,
        patientAddressCountryCode: "ie",
        doctorId: DOCTOR_ID,
      },
    ],
    ...over,
  };
};

beforeEach(() => {
  setOrder();
  state.appointment = {
    scheduledAt: NEW_START,
    doctorId: DOCTOR_ID,
    serviceId: "svc-1",
    countryCode: "ie",
    locationAddress: null,
    testCenter: null,
    testCenterLocation: null,
  };
  state.emails = [];
  state.whatsapps = [];
  state.runs = [];
  state.adminAlerts = [];
});

describe("appointment updated → PAID order notifies patient AND doctor", () => {
  it("emails and WhatsApps both sides, and alerts admin", async () => {
    const result = await svc.sendAppointmentUpdateNotifications({
      orderId: ORDER_ID,
      appointmentId: APPT_ID,
      changeReason: "",
      previousDoctorId: DOCTOR_ID,
      newDoctorId: DOCTOR_ID,
      meetingUrl: "https://meet.example/new",
    });

    assert.equal(result.sent, true);
    assert.ok(
      state.emails.some((e) => e.to === PATIENT_EMAIL),
      "patient was emailed",
    );
    assert.ok(
      state.emails.some((e) => e.to === DOCTOR_EMAIL),
      "doctor was emailed — the regression that started this",
    );
    assert.ok(
      state.whatsapps.some((w) => w.to === PATIENT_PHONE),
      "patient got WhatsApp",
    );
    assert.ok(
      state.whatsapps.some((w) => w.to === DOCTOR_PHONE),
      "doctor got WhatsApp",
    );
    assert.deepEqual(state.adminAlerts, [ORDER_ID], "admin alerted once");
  });

  it("carries the NEW consultation time into the doctor's message", async () => {
    await svc.sendAppointmentUpdateNotifications({
      orderId: ORDER_ID,
      appointmentId: APPT_ID,
      changeReason: "",
      previousDoctorId: DOCTOR_ID,
      newDoctorId: DOCTOR_ID,
      meetingUrl: "https://meet.example/new",
    });

    const doctorMsg = state.whatsapps.find((w) => w.to === DOCTOR_PHONE);
    assert.ok(doctorMsg, "doctor WhatsApp exists");
    assert.match(
      doctorMsg.message,
      /Nov 2026/,
      "quotes the new date, not the old one",
    );
  });

  it("tells the previous doctor too when the consultation is reassigned", async () => {
    await svc.sendAppointmentUpdateNotifications({
      orderId: ORDER_ID,
      appointmentId: APPT_ID,
      changeReason: "Doctor unavailable",
      previousDoctorId: "doc-old",
      newDoctorId: DOCTOR_ID,
      meetingUrl: "https://meet.example/new",
    });

    const keys = sentKeys();
    assert.ok(
      keys.includes("appointment_update_doctor_email"),
      "new doctor told",
    );
    assert.ok(
      keys.includes("appointment_update_doctor_email_previous"),
      "previous doctor told they lost it",
    );
  });
});

describe("appointment updated → UNPAID order still notifies both sides", () => {
  it("notifies patient and doctor, and restates the payment deadline", async () => {
    setOrder({
      status: "PENDING",
      paymentDueAt: new Date("2026-10-30T10:00:00.000Z"),
    });

    const result = await svc.sendAppointmentUpdateNotifications({
      orderId: ORDER_ID,
      appointmentId: APPT_ID,
      changeReason: "",
      previousDoctorId: DOCTOR_ID,
      newDoctorId: DOCTOR_ID,
      meetingUrl: null,
    });

    assert.equal(result.sent, true);
    assert.ok(state.emails.some((e) => e.to === PATIENT_EMAIL), "patient emailed");
    assert.ok(state.emails.some((e) => e.to === DOCTOR_EMAIL), "doctor emailed");

    const patientMsg = state.whatsapps.find((w) => w.to === PATIENT_PHONE);
    assert.ok(patientMsg, "patient WhatsApp exists");
    assert.match(
      patientMsg.message,
      /Oct 2026/,
      "an unpaid reschedule restates the re-anchored payment deadline",
    );
  });
});

describe("doctor swap → the incoming doctor is told, the outgoing one too", () => {
  /**
   * A pure reassignment keeps the same time and the same link, so the admin
   * form sends no schedule email for it. That used to mean the incoming
   * doctor got nothing but an in-portal bell and the patient was never told
   * their clinician had changed at all.
   */
  const swap = (over: Record<string, unknown> = {}) =>
    svc.sendAppointmentUpdateNotifications({
      orderId: ORDER_ID,
      appointmentId: APPT_ID,
      changeReason: "",
      previousDoctorId: "doc-old",
      newDoctorId: DOCTOR_ID,
      meetingUrl: "https://meet.example/new",
      ...over,
    });

  it("emails and WhatsApps the incoming doctor", async () => {
    await swap();

    assert.ok(
      state.emails.some((e) => e.to === DOCTOR_EMAIL),
      "incoming doctor emailed",
    );
    assert.ok(
      state.whatsapps.some((w) => w.to === DOCTOR_PHONE),
      "incoming doctor WhatsApped",
    );
    const keys = sentKeys();
    assert.ok(keys.includes("appointment_update_doctor_email"));
    assert.ok(keys.includes("appointment_update_doctor_whatsapp"));
  });

  it("sends the outgoing doctor the reassigned wording, on its own run keys", async () => {
    await swap();

    const keys = sentKeys();
    assert.ok(
      keys.includes("appointment_update_doctor_email_previous"),
      "previous doctor emailed",
    );
    assert.ok(
      keys.includes("appointment_update_doctor_whatsapp_previous"),
      "previous doctor WhatsApped",
    );
  });

  it("tells the PATIENT their clinician changed when no schedule email covers it", async () => {
    // skipPatient is false on a doctor-only swap precisely because the admin
    // form's branded schedule email does not fire for one.
    await swap({ skipPatient: false });

    assert.ok(
      state.emails.some((e) => e.to === PATIENT_EMAIL),
      "patient emailed about the change",
    );
    assert.ok(
      state.whatsapps.some((w) => w.to === PATIENT_PHONE),
      "patient WhatsApped about the change",
    );
  });

  it("still re-arms nothing it should not — the admin alert fires once", async () => {
    await swap();

    assert.deepEqual(state.adminAlerts, [ORDER_ID]);
  });
});

describe("admin appointment form → skipPatient keeps the doctor channels", () => {
  it("suppresses the duplicate patient copy but still tells the doctor", async () => {
    await svc.sendAppointmentUpdateNotifications({
      orderId: ORDER_ID,
      appointmentId: APPT_ID,
      changeReason: "",
      previousDoctorId: DOCTOR_ID,
      newDoctorId: DOCTOR_ID,
      meetingUrl: "https://meet.example/new",
      skipPatient: true,
    });

    assert.equal(
      state.emails.some((e) => e.to === PATIENT_EMAIL),
      false,
      "no second patient email — the branded schedule email is their copy",
    );
    assert.equal(
      state.whatsapps.some((w) => w.to === PATIENT_PHONE),
      false,
      "no patient WhatsApp either",
    );
    assert.ok(
      state.emails.some((e) => e.to === DOCTOR_EMAIL),
      "doctor still emailed",
    );
    assert.ok(
      state.whatsapps.some((w) => w.to === DOCTOR_PHONE),
      "doctor still WhatsApped",
    );
    assert.deepEqual(state.adminAlerts, [ORDER_ID], "admin still alerted");
  });

  it("records the suppressed patient channels rather than leaving a silent gap", async () => {
    await svc.sendAppointmentUpdateNotifications({
      orderId: ORDER_ID,
      appointmentId: APPT_ID,
      changeReason: "",
      previousDoctorId: DOCTOR_ID,
      newDoctorId: DOCTOR_ID,
      meetingUrl: "https://meet.example/new",
      skipPatient: true,
    });

    const skipped = skippedKeys();
    assert.ok(skipped.includes("appointment_update_patient_email"));
    assert.ok(skipped.includes("appointment_update_patient_whatsapp"));
  });
});

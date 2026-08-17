import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * Corporate booking confirmations. Three properties carry this and none is
 * visible from a type check:
 *
 *   1. **The patient's WhatsApp is consent-gated; the doctor's is not.** Both
 *      go through the same sender, so the asymmetry is one argument wide and
 *      trivial to flip into a GDPR breach.
 *   2. **A meeting link is never overwritten.** Provisioning runs on a booking
 *      an admin may already have given a link, so the write is guarded.
 *   3. **No channel can take another down.** These run after the slot is
 *      claimed; a mail outage must not cost the doctor their notification.
 *
 * Fully mocked — zero DB, mail or network contact (needs
 * `--experimental-test-module-mocks`).
 */

type Row = Record<string, unknown> | null;

const state: {
  appointment: Row;
  meetConfigured: boolean;
  meetThrows: boolean;
  meetAttendees: string[];
  updateManyWhere: Record<string, unknown> | null;
  emails: { to: string; meetingUrl: string | null }[];
  whatsapps: { to: string; patientConsent?: boolean | null }[];
  bells: { doctorId: string; type: string }[];
  emailThrowsFor: string | null;
} = {
  appointment: null,
  meetConfigured: false,
  meetThrows: false,
  meetAttendees: [],
  updateManyWhere: null,
  emails: [],
  whatsapps: [],
  bells: [],
  emailThrowsFor: null,
};

let svc: typeof import("./corporate-booking-notifications.js");

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        appointment: {
          findUnique: async () => state.appointment,
          updateMany: async (args: { where: Record<string, unknown> }) => {
            state.updateManyWhere = args.where;
            return { count: 1 };
          },
        },
      },
    },
  });
  mock.module("../../lib/google-meet/google-meet.service.js", {
    namedExports: {
      isGoogleMeetConfigured: () => state.meetConfigured,
      createMeetLinkForAppointment: async (opts: { attendeeEmails?: string[] }) => {
        state.meetAttendees = opts.attendeeEmails ?? [];
        if (state.meetThrows) throw new Error("meet down");
        return "https://meet.google.com/minted";
      },
    },
  });
  mock.module("../../lib/whatsapp/resolve-doctor-contact.js", {
    namedExports: {
      resolveDoctorContact: async () => ({
        fullName: "Dr. Tiago Almeida",
        title: "GP",
        whatsappNumber: "+353871234567",
        whatsappRaw: "+353871234567",
        whatsappHints: {},
        loginEmail: "tiago@example.test",
      }),
    },
  });
  mock.module("../../lib/whatsapp/wasender.js", {
    namedExports: {
      sendWhatsAppText: async (opts: { to: string; patientConsent?: boolean | null }) => {
        // Record the key only when the caller passed it — "omitted" and
        // "explicitly undefined" are the same to the sender but not to this
        // test, which is asserting the gate was opted out of on purpose.
        state.whatsapps.push(
          "patientConsent" in opts
            ? { to: opts.to, patientConsent: opts.patientConsent }
            : { to: opts.to },
        );
        return { ok: true };
      },
    },
  });
  mock.module("../notifications/notify.service.js", {
    namedExports: {
      notifyDoctor: async (doctorId: string, type: string) => {
        state.bells.push({ doctorId, type });
      },
    },
  });
  mock.module("../doctor-availability/doctor-availability.service.js", {
    namedExports: { resolveDoctorTimeZone: async () => "Europe/Dublin" },
  });
  mock.module("./corporate-emails.js", {
    namedExports: {
      sendCorporateBookingConfirmationEmail: async (o: { to: string; meetingUrl: string | null }) => {
        if (state.emailThrowsFor === "patient") throw new Error("mail down");
        state.emails.push({ to: o.to, meetingUrl: o.meetingUrl });
      },
      sendCorporateDoctorBookingEmail: async (o: { to: string; meetingUrl: string | null }) => {
        state.emails.push({ to: o.to, meetingUrl: o.meetingUrl });
      },
      corporateBookingText: () => "patient text",
      corporateDoctorBookingText: () => "doctor text",
    },
  });
  svc = await import("./corporate-booking-notifications.js");
});

beforeEach(() => {
  state.appointment = {
    id: "appt-1",
    email: "pedro@example.test",
    fullName: "Pedro Silva",
    phone: "+351911111111",
    countryCode: "pt",
    consultationType: "Pre-assessment Consultation",
    scheduledAt: new Date("2026-09-22T08:00:00Z"),
    meetingUrl: null,
    whatsappConsent: true,
    corporateServiceId: "cs-1",
    doctorId: "doc-1",
    corporateService: { durationMinutes: 30 },
  };
  state.meetConfigured = false;
  state.meetThrows = false;
  state.meetAttendees = [];
  state.updateManyWhere = null;
  state.emails = [];
  state.whatsapps = [];
  state.bells = [];
  state.emailThrowsFor = null;
});

describe("notifyCorporateBookingCreated", () => {
  it("gates the patient's WhatsApp on consent and never the doctor's", async () => {
    await svc.notifyCorporateBookingCreated("appt-1");
    const patient = state.whatsapps.find((w) => w.to === "+351911111111");
    const doctor = state.whatsapps.find((w) => w.to === "+353871234567");
    assert.equal(patient?.patientConsent, true);
    // Absent, not `true`: the doctor send opts OUT of the gate rather than
    // asserting a consent nobody recorded for staff.
    assert.equal(doctor && "patientConsent" in doctor, false);
  });

  it("passes a withheld consent straight through, so the sender fails closed", async () => {
    state.appointment = { ...(state.appointment as Record<string, unknown>), whatsappConsent: false };
    await svc.notifyCorporateBookingCreated("appt-1");
    assert.equal(state.whatsapps.find((w) => w.to === "+351911111111")?.patientConsent, false);
  });

  it("notifies patient, doctor email and doctor portal on one booking", async () => {
    await svc.notifyCorporateBookingCreated("appt-1");
    assert.deepEqual(state.emails.map((e) => e.to), ["pedro@example.test", "tiago@example.test"]);
    assert.deepEqual(state.bells, [{ doctorId: "doc-1", type: "APPOINTMENT_ASSIGNED" }]);
  });

  it("mints a Meet link and guards the write so an admin-set link wins", async () => {
    state.meetConfigured = true;
    await svc.notifyCorporateBookingCreated("appt-1");
    assert.deepEqual(state.updateManyWhere, { id: "appt-1", meetingUrl: null });
    assert.ok(state.emails.every((e) => e.meetingUrl === "https://meet.google.com/minted"));
  });

  /** Google mails every attendee its own raw calendar invite
   *  (`?sendUpdates=all`). Listing the patient reached them as "Invitation
   *  from an unknown sender" with a Report spam button, put the doctor's
   *  personal address in the patient's Who list and the patient's address in
   *  the subject. The member's link belongs in our own branded confirmation. */
  it("never puts the patient on the calendar event", async () => {
    state.meetConfigured = true;
    await svc.notifyCorporateBookingCreated("appt-1");
    assert.deepEqual(state.meetAttendees, ["tiago@example.test"]);
    assert.equal(state.meetAttendees.includes("pedro@example.test"), false);
  });

  it("does not re-mint when the appointment already has a link", async () => {
    state.meetConfigured = true;
    state.appointment = {
      ...(state.appointment as Record<string, unknown>),
      meetingUrl: "https://meet.google.com/admin-set",
    };
    await svc.notifyCorporateBookingCreated("appt-1");
    assert.equal(state.updateManyWhere, null);
    assert.ok(state.emails.every((e) => e.meetingUrl === "https://meet.google.com/admin-set"));
  });

  it("still confirms the booking when Meet is unconfigured or down", async () => {
    state.meetConfigured = true;
    state.meetThrows = true;
    await svc.notifyCorporateBookingCreated("appt-1");
    assert.equal(state.emails.length, 2);
    assert.ok(state.emails.every((e) => e.meetingUrl === null));
  });

  it("still notifies the doctor when the patient's email fails", async () => {
    state.emailThrowsFor = "patient";
    await svc.notifyCorporateBookingCreated("appt-1");
    assert.deepEqual(state.emails.map((e) => e.to), ["tiago@example.test"]);
    assert.equal(state.bells.length, 1);
  });

  it("no-ops for an ordinary catalogue booking", async () => {
    state.appointment = {
      ...(state.appointment as Record<string, unknown>),
      corporateServiceId: null,
      corporateService: null,
    };
    await svc.notifyCorporateBookingCreated("appt-1");
    assert.deepEqual(state.emails, []);
    assert.deepEqual(state.whatsapps, []);
    assert.deepEqual(state.bells, []);
  });
});

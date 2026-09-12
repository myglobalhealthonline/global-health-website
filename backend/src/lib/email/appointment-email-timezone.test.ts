import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * The schedule/reschedule confirmation and the 24h reminder must quote the
 * consultation on the PATIENT'S clock, labelled by country.
 *
 * Reported off a rescheduled paid consultation that arrived reading
 * "12 Sept 2026, 16:30 (UTC)" — the template already accepted a `timeZone`,
 * but the only caller never passed one, so every send silently fell back to
 * the server's UTC clock. A patient reading "16:30" then showed up an hour
 * late for a 17:30 local appointment.
 *
 * Fully mocked — no mail leaves the process (needs
 * `--experimental-test-module-mocks`).
 */

const sent: { subject: string; text: string; html: string }[] = [];

let templates: typeof import("./templates.js");

const SCHEDULED_AT = new Date("2026-09-12T16:30:00.000Z");

before(async () => {
  const capture = async (msg: { subject?: string; text?: string; html?: string }) => {
    sent.push({
      subject: msg.subject ?? "",
      text: msg.text ?? "",
      html: msg.html ?? "",
    });
    return { ok: true };
  };
  mock.module("./send-email.js", {
    namedExports: {
      sendEmail: capture,
      absoluteSiteUrl: (path: string) => `https://example.test${path}`,
    },
  });
  mock.module("../../modules/automation/send-automation-notification.js", {
    namedExports: { sendAutomationEmail: capture },
  });
  templates = await import("./templates.js");
});

beforeEach(() => {
  sent.length = 0;
});

const scheduleEmail = (timeZone: string | null) =>
  templates.sendAppointmentScheduledEmail({
    to: "patient@example.com",
    fullName: "Jonathan Dahle",
    consultationType: "general",
    scheduledAt: SCHEDULED_AT,
    meetingUrl: "https://meet.google.com/rmr-orcn-drn",
    doctorName: "Robert Gabriel Brindus",
    timeZone,
  });

describe("reschedule confirmation email renders the patient's local time", () => {
  // One instant, every market the platform books in. 16:30 UTC is a different
  // wall clock in each — the whole point of the fix.
  const cases: { zone: string; expected: string }[] = [
    { zone: "Europe/Dublin", expected: "17:30 (Ireland)" },
    { zone: "Europe/Lisbon", expected: "17:30 (Portugal)" },
    { zone: "Europe/Prague", expected: "18:30 (Czechia)" },
    { zone: "Europe/Madrid", expected: "18:30 (Spain)" },
    { zone: "Europe/Bucharest", expected: "19:30 (Romania)" },
    { zone: "Europe/Berlin", expected: "18:30 (Germany)" },
  ];

  for (const { zone, expected } of cases) {
    it(`renders ${zone} as "${expected}"`, async () => {
      await scheduleEmail(zone);

      assert.equal(sent.length, 1, "exactly one email");
      const mail = sent[0]!;
      assert.ok(
        mail.text.includes(expected),
        `plain-text body should quote ${expected}, got: ${mail.text.slice(0, 200)}`,
      );
      assert.ok(
        mail.html.includes(expected),
        `HTML body should quote ${expected}`,
      );
      assert.equal(
        mail.text.includes("(UTC)"),
        false,
        "never leaks the server clock to the patient",
      );
    });
  }

  it("labels a multi-timezone country by city rather than guessing", async () => {
    // Brazil spans several zones, so "Brazil" would not identify a time.
    await scheduleEmail("America/Sao_Paulo");

    assert.ok(sent[0]!.text.includes("13:30 (Sao Paulo)"));
  });

  it("falls back to UTC only when no zone is known at all", async () => {
    await scheduleEmail(null);

    assert.ok(
      sent[0]!.text.includes("16:30 (UTC)"),
      "an unknown zone is rendered as an obviously-UTC instant, not a wrong local guess",
    );
  });
});

describe("24h reminder email renders the patient's local time", () => {
  it("quotes the country-local wall clock, not UTC", async () => {
    await templates.sendAppointmentReminderEmail({
      to: "patient@example.com",
      fullName: "Lidia Mara Ponciano",
      consultationType: "general",
      scheduledAt: SCHEDULED_AT,
      meetingUrl: "https://meet.google.com/xeu-zshj-trx",
      doctorName: "Tiago Miguel Figueira",
      timeZone: "Europe/Lisbon",
    });

    assert.equal(sent.length, 1);
    const mail = sent[0]!;
    assert.ok(mail.text.includes("17:30 (Portugal)"));
    assert.equal(mail.text.includes("(UTC)"), false);
  });
});

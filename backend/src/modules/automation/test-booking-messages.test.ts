import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  attendanceAdviceLine,
  attendanceLine,
  attendeeLine,
  type Attendance,
} from "./attendance-line.js";
import {
  patientWhatsAppMeetingLink,
  type PostPaymentMessageContext,
} from "./post-payment-messages.js";

/**
 * The one divergence between a consultation and a test booking, pinned in the
 * place a patient actually sees it.
 *
 * The failure these guard against is not cosmetic: a patient told to "join a
 * meeting link" for a blood draw does not turn up at the clinic, and a patient
 * whose confirmation names a doctor who does not exist has no idea what they
 * bought.
 */

const MEET: Attendance = {
  kind: "MEET",
  display: "meet.google.com/abc-defg-hij",
};
const VENUE: Attendance = {
  kind: "VENUE",
  display: "Synlab Lisboa, Rua Example 12, Lisboa",
  venueName: "Synlab Lisboa",
};

function ctxWith(attendance: Attendance): PostPaymentMessageContext {
  return {
    patientName: "Jane Doe",
    patientFirstName: "Jane",
    patientLastName: "Doe",
    patientEmail: "jane@example.com",
    patientPhone: "+351912345678",
    serviceName: "PT - Full Blood Count",
    doctorName: "Dr Smith",
    appointmentDate: "17 Jun 2026, 11:00",
    appointmentDateTime: "17 Jun 2026, 11:00",
    meetingLink: attendance.kind === "MEET" ? "https://meet.google.com/abc-defg-hij" : "",
    meetingLinkDisplay: attendance.kind === "MEET" ? attendance.display : "",
    attendeeLine: attendeeLine(attendance, "Dr Smith", "en"),
    attendanceLine: attendanceLine(attendance, "en"),
    attendanceAdvice: attendanceAdviceLine(attendance, "en"),
    orderNumber: "ORD-000029",
    totalLabel: "€25.00",
  };
}

describe("attendance lines", () => {
  it("names the centre, not a doctor, for a venue booking", () => {
    const line = attendeeLine(VENUE, "Dr Smith", "en");
    assert.match(line, /Test centre/);
    assert.match(line, /Synlab Lisboa/);
    assert.doesNotMatch(line, /Dr Smith/);
    assert.doesNotMatch(line, /Doctor/);
  });

  it("gives the address, not a meeting link, for a venue booking", () => {
    const line = attendanceLine(VENUE, "en");
    assert.match(line, /Address/);
    assert.match(line, /Rua Example 12/);
    assert.doesNotMatch(line, /Meeting Link/i);
  });

  it("tells a venue patient to arrive, not to join", () => {
    assert.match(attendanceAdviceLine(VENUE, "en"), /arrive/i);
    assert.match(attendanceAdviceLine(MEET, "en"), /join/i);
  });

  it("keeps the doctor + meeting wording for a consultation", () => {
    assert.match(attendeeLine(MEET, "Dr Smith", "en"), /Doctor: Dr Smith/);
    assert.match(attendanceLine(MEET, "en"), /Meeting Link/);
  });

  it("localizes both lines rather than leaking English", () => {
    assert.match(attendeeLine(VENUE, "Dr Smith", "pt"), /Centro de exames/);
    assert.match(attendanceLine(VENUE, "pt"), /Morada/);
    assert.match(attendeeLine(MEET, "Dr Silva", "pt"), /Médico/);
  });

  it("falls back to an em dash rather than an empty label", () => {
    const line = attendanceLine({ kind: "MEET", display: "   " }, "en");
    assert.match(line, /—/);
  });
});

describe("patient confirmation message", () => {
  it("a test booking carries the address and names no doctor or meeting", () => {
    const msg = patientWhatsAppMeetingLink(ctxWith(VENUE), "en");
    assert.match(msg, /Synlab Lisboa/);
    assert.match(msg, /Rua Example 12/);
    assert.match(msg, /arrive/i);
    // The regressions that matter.
    assert.doesNotMatch(msg, /Meeting Link/i);
    assert.doesNotMatch(msg, /Doctor:/);
    assert.doesNotMatch(msg, /meet\.google\.com/);
  });

  it("a consultation is unchanged — still doctor + meeting link", () => {
    const msg = patientWhatsAppMeetingLink(ctxWith(MEET), "en");
    assert.match(msg, /Doctor: Dr Smith/);
    assert.match(msg, /Meeting Link/);
    assert.match(msg, /meet\.google\.com\/abc-defg-hij/);
    assert.match(msg, /join/i);
    assert.doesNotMatch(msg, /Address:/);
  });

  it("keeps the shared parts identical either way", () => {
    for (const attendance of [MEET, VENUE]) {
      const msg = patientWhatsAppMeetingLink(ctxWith(attendance), "en");
      assert.match(msg, /Jane Doe/);
      assert.match(msg, /PT - Full Blood Count/);
      assert.match(msg, /17 Jun 2026, 11:00/);
    }
  });
});

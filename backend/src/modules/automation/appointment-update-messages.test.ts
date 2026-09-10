import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  doctorWhatsAppAppointmentReassigned,
  doctorWhatsAppAppointmentUpdated,
  patientWhatsAppAppointmentUpdated,
  type PostPaymentMessageContext,
} from "./post-payment-messages.js";

const baseCtx: PostPaymentMessageContext = {
  patientName: "Jane Doe",
  patientFirstName: "Jane",
  patientLastName: "Doe",
  patientEmail: "jane@example.com",
  patientPhone: "+353891234567",
  serviceName: "IE - General Consultation",
  doctorName: "Dr Smith",
  appointmentDate: "17 Jun 2026, 11:00",
  appointmentDateTime: "17 Jun 2026, 11:00",
  meetingLink: "https://meet.google.com/abc-defg-hij",
  meetingLinkDisplay: "meet.google.com/abc-defg-hij",
  attendeeLine: "👤 Doctor: Dr Smith",
  attendanceLine: "💻 Meeting Link: meet.google.com/abc-defg-hij",
  attendanceAdvice: "Please join a few minutes before your appointment.",
  orderNumber: "ORD-000029",
  totalLabel: "€50.00",
  changeReason: "Doctor unavailable on original date",
};

describe("appointment update messages", () => {
  it("patient WhatsApp includes reason and datetime", () => {
    const msg = patientWhatsAppAppointmentUpdated(baseCtx, "en");
    assert.match(msg, /updated/i);
    assert.match(msg, /17 Jun 2026, 11:00/);
    assert.match(msg, /Doctor unavailable on original date/);
    assert.match(msg, /meet\.google\.com\/abc-defg-hij/);
  });

  it("patient WhatsApp omits payment deadline when order is paid (no deadline set)", () => {
    const msg = patientWhatsAppAppointmentUpdated(baseCtx, "en");
    assert.doesNotMatch(msg, /Payment deadline/i);
  });

  it("patient WhatsApp restates the payment deadline for a rescheduled-but-unpaid order", () => {
    const msg = patientWhatsAppAppointmentUpdated(
      { ...baseCtx, paymentDeadline: "17 Jun 2026, 14:30 (Ireland)" },
      "en",
    );
    assert.match(msg, /Payment deadline: 17 Jun 2026, 14:30 \(Ireland\)/);
  });

  it("patient WhatsApp restates the payment deadline in Portuguese", () => {
    const msg = patientWhatsAppAppointmentUpdated(
      { ...baseCtx, paymentDeadline: "17 Jun 2026, 14:30 (Irlanda)" },
      "pt",
    );
    assert.match(msg, /Prazo de pagamento: 17 Jun 2026, 14:30 \(Irlanda\)/);
  });

  it("doctor updated WhatsApp includes reason", () => {
    const msg = doctorWhatsAppAppointmentUpdated(baseCtx, "en");
    assert.match(msg, /updated/i);
    assert.match(msg, /Jane Doe/);
    assert.match(msg, /Doctor unavailable on original date/);
  });

  it("previous doctor WhatsApp uses reassigned wording", () => {
    const msg = doctorWhatsAppAppointmentReassigned(baseCtx, "en");
    assert.match(msg, /reassigned/i);
    assert.match(msg, /Doctor unavailable on original date/);
  });
});

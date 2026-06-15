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

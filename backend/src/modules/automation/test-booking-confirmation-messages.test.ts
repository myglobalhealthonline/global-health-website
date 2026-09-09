import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Attendance } from "./attendance-line.js";
import { NOTIFICATION_LANGS } from "./notification-language.js";
import {
  patientEmailSubjectTestBookingConfirmation,
  patientWhatsAppTestBookingConfirmation,
  type TestBookingConfirmationContext,
} from "./test-booking-confirmation-messages.js";

const VENUE: Attendance = {
  kind: "VENUE",
  display: "Av. da República 25, Lisboa",
  venueName: "Synlab — Saldanha",
};

const CTX: TestBookingConfirmationContext = {
  patientName: "Ana Silva",
  examName: "Full Blood Count",
  appointmentDateTime: "Mon 15 Sep 2026, 09:30",
  attendance: VENUE,
  labReference: "REQ-88213",
};

describe("test booking confirmation", () => {
  it("names the centre, the address, the time and what to do, in every language", () => {
    for (const lang of NOTIFICATION_LANGS) {
      const text = patientWhatsAppTestBookingConfirmation(CTX, lang);
      assert.match(text, /Synlab — Saldanha/, lang);
      assert.match(text, /Av\. da República 25, Lisboa/, lang);
      assert.match(text, /Mon 15 Sep 2026, 09:30/, lang);
      assert.match(text, /Full Blood Count/, lang);
      // "arrive 5–10 minutes before", from the shared attendance helper.
      assert.match(text, /5[–-]10/, lang);
      assert.match(text, /globalhealth@myglobalhealth\.online/, lang);
    }
  });

  it("includes the lab reference when there is one", () => {
    assert.match(patientWhatsAppTestBookingConfirmation(CTX, "en"), /REQ-88213/);
  });

  /**
   * The case the admin hits most: the lab gave no code. The confirmation must
   * still go out, and must not print an empty "Booking reference:" label.
   */
  it("omits the reference line entirely when the lab gave no code", () => {
    for (const reference of [null, "", "   "]) {
      const text = patientWhatsAppTestBookingConfirmation(
        { ...CTX, labReference: reference },
        "en",
      );
      assert.doesNotMatch(text, /Booking reference/, JSON.stringify(reference));
      // The parts that make it a confirmation are still all there.
      assert.match(text, /Synlab — Saldanha/);
      assert.match(text, /Mon 15 Sep 2026, 09:30/);
    }
  });

  it("never tells a test patient to join a meeting link", () => {
    for (const lang of NOTIFICATION_LANGS) {
      const text = patientWhatsAppTestBookingConfirmation(CTX, lang);
      assert.doesNotMatch(text, /https?:\/\/meet/i, lang);
      assert.doesNotMatch(text, /Meeting Link/i, lang);
    }
  });

  it("localizes the subject rather than falling back to English", () => {
    assert.match(patientEmailSubjectTestBookingConfirmation(CTX, "pt"), /confirmada/i);
    assert.match(patientEmailSubjectTestBookingConfirmation(CTX, "cs"), /potvrzen/i);
    assert.match(patientEmailSubjectTestBookingConfirmation(CTX, "en"), /confirmed/i);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatExamsNotes,
  isEmailSendable,
  isEmailSendableForCountry,
  isInReviewQueue,
  isVisibleInHistory,
  ABSENCE_DEFAULT_REASON,
  absenceDefaultReason,
} from "./document-template-utils.js";

describe("formatExamsNotes", () => {
  it("joins exams with comma and appends notes with two spaces", () => {
    assert.equal(
      formatExamsNotes("Blood Analysis\nX-Ray Chest", "Fasting required"),
      "Blood Analysis, X-Ray Chest  Fasting required",
    );
  });

  it("returns empty when both empty", () => {
    assert.equal(formatExamsNotes("", ""), "");
  });
});

describe("review queue and history", () => {
  it("prescription draft is in review queue", () => {
    assert.equal(isInReviewQueue("PRESCRIPTION", false), true);
  });

  it("exams draft is in review queue", () => {
    assert.equal(isInReviewQueue("EXAMS_PRESCRIPTION", false), true);
  });

  it("unsent prescription hidden from history", () => {
    // Deliberate behavior change in 986832ba (medicine prescription finalize
    // flow): PRESCRIPTION no longer auto-visible in history to avoid the
    // dual-display bug. It now requires finalize (sentToPatient=true) like
    // every other document type. This assertion was left stale (still
    // asserting `true`) when the source changed — restoring it to match the
    // test name and the intended (safer) behavior.
    assert.equal(isVisibleInHistory("PRESCRIPTION", false), false);
  });

  it("sent prescription visible in history", () => {
    assert.equal(isVisibleInHistory("PRESCRIPTION", true), true);
  });

  it("unsent exams hidden from history", () => {
    assert.equal(isVisibleInHistory("EXAMS_PRESCRIPTION", false), false);
  });

  it("sent exams visible in history", () => {
    assert.equal(isVisibleInHistory("EXAMS_PRESCRIPTION", true), true);
  });

  it("prescription is not email sendable", () => {
    assert.equal(isEmailSendable("PRESCRIPTION"), false);
  });

  it("exams and absence are email sendable", () => {
    assert.equal(isEmailSendable("EXAMS_PRESCRIPTION"), true);
    assert.equal(isEmailSendable("ABSENCE_CERTIFICATE"), true);
  });
});

describe("isEmailSendableForCountry", () => {
  it("allows the medicine prescription in CZ, ES and RO only", () => {
    for (const code of ["cz", "sp", "es", "rm", "ro", "CZ", " Sp "]) {
      assert.equal(isEmailSendableForCountry("PRESCRIPTION", code), true, code);
    }
    for (const code of ["ie", "pt", "br", "", null, undefined]) {
      assert.equal(isEmailSendableForCountry("PRESCRIPTION", code), false, String(code));
    }
  });

  it("leaves the country-independent types alone", () => {
    assert.equal(isEmailSendableForCountry("EXAMS_PRESCRIPTION", "ie"), true);
    assert.equal(isEmailSendableForCountry("ABSENCE_CERTIFICATE", "br"), true);
  });
});

describe("ABSENCE_DEFAULT_REASON", () => {
  it("is GDPR default", () => {
    assert.equal(ABSENCE_DEFAULT_REASON, "Medical Confidentiality (GDPR)");
  });
});

describe("absenceDefaultReason", () => {
  it("uses the country's data-protection law name", () => {
    assert.equal(absenceDefaultReason("LGPD"), "Medical Confidentiality (LGPD)");
  });

  it("falls back to GDPR when missing or blank", () => {
    assert.equal(absenceDefaultReason(null), "Medical Confidentiality (GDPR)");
    assert.equal(absenceDefaultReason(undefined), "Medical Confidentiality (GDPR)");
    assert.equal(absenceDefaultReason("   "), "Medical Confidentiality (GDPR)");
  });
});

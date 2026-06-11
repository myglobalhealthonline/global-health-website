import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatExamsNotes,
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
  it("prescription is not in review queue", () => {
    assert.equal(isInReviewQueue("PRESCRIPTION", false), false);
  });

  it("exams draft is in review queue", () => {
    assert.equal(isInReviewQueue("EXAMS_PRESCRIPTION", false), true);
  });

  it("prescription always visible in history", () => {
    assert.equal(isVisibleInHistory("PRESCRIPTION", false), true);
  });

  it("unsent exams hidden from history", () => {
    assert.equal(isVisibleInHistory("EXAMS_PRESCRIPTION", false), false);
  });

  it("sent exams visible in history", () => {
    assert.equal(isVisibleInHistory("EXAMS_PRESCRIPTION", true), true);
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

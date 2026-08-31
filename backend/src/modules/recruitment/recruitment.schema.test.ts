import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addCalendarMonths,
  adminJobCreateBodySchema,
  adminJobPatchBodySchema,
  adminApplicationsQuerySchema,
  applicationFieldsSchema,
  isAllowedJobTransition,
  validateCvPdf,
} from "./recruitment.schema.js";

describe("recruitment validation", () => {
  const job = {
    countryId: "country-ie",
    locale: "EN",
    slug: "general-practitioner",
    title: "General Practitioner",
    department: "Medical",
    location: "Ireland (Remote)",
    workplaceMode: "REMOTE",
    employmentType: "Contract",
    minimumExperience: null,
    descriptionHtml: "<h2>Role</h2><p>Provide remote care.</p>",
    status: "DRAFT",
    closesAt: null,
  };

  it("accepts a complete job and rejects unsafe slugs", () => {
    assert.equal(adminJobCreateBodySchema.safeParse(job).success, true);
    assert.equal(
      adminJobCreateBodySchema.safeParse({ ...job, slug: "General Practitioner" }).success,
      false,
    );
  });

  it("does not inject a draft status into a partial job update", () => {
    const parsed = adminJobPatchBodySchema.parse({ title: "Updated title" });
    assert.equal(Object.hasOwn(parsed, "status"), false);
  });

  it("normalizes application text without accepting privacy opt-out", () => {
    const parsed = applicationFieldsSchema.safeParse({
      fullName: "  Jane   Doe ",
      email: " JANE@example.com ",
      phone: " +353 1 555 0100 ",
      message: " Interested ",
      privacyAcknowledged: "true",
      privacyNoticeLocale: "EN",
      website: "",
    });
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.fullName, "Jane Doe");
    assert.equal(parsed.data.email, "jane@example.com");
    assert.equal(parsed.data.message, "Interested");
    assert.equal(
      applicationFieldsSchema.safeParse({ ...parsed.data, privacyAcknowledged: "false" }).success,
      false,
    );
  });

  it("enforces the one-way job lifecycle", () => {
    assert.equal(isAllowedJobTransition("DRAFT", "PUBLISHED"), true);
    assert.equal(isAllowedJobTransition("PUBLISHED", "ARCHIVED"), true);
    assert.equal(isAllowedJobTransition("ARCHIVED", "PUBLISHED"), false);
    assert.equal(isAllowedJobTransition("ARCHIVED", "DRAFT"), false);
  });

  it("adds calendar months with month-end clamping", () => {
    assert.equal(
      addCalendarMonths(new Date("2026-08-31T12:30:00.000Z"), 6).toISOString(),
      "2027-02-28T12:30:00.000Z",
    );
    assert.equal(
      addCalendarMonths(new Date("2023-08-31T00:00:00.000Z"), 6).toISOString(),
      "2024-02-29T00:00:00.000Z",
    );
  });

  it("turns a date-only submittedTo filter into the next UTC day boundary", () => {
    const parsed = adminApplicationsQuerySchema.parse({ submittedTo: "2026-08-31" });
    assert.equal(parsed.submittedTo?.toISOString(), "2026-09-01T00:00:00.000Z");
  });

  it("accepts only a real, size-bounded PDF with a single .pdf suffix", () => {
    const pdf = Buffer.from("%PDF-1.4\n% test\n");
    assert.deepEqual(validateCvPdf(pdf, "resume.PDF", "application/pdf"), { ok: true });
    assert.equal(validateCvPdf(Buffer.from("not a pdf here"), "resume.pdf", "application/pdf").ok, false);
    assert.equal(validateCvPdf(pdf, "resume.pdf.exe", "application/pdf").ok, false);
    assert.equal(validateCvPdf(pdf, "resume.pdf", "text/plain").ok, false);
    assert.equal(validateCvPdf(Buffer.alloc(5 * 1024 * 1024 + 1), "resume.pdf", "application/pdf").ok, false);
  });
});

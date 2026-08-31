import { describe, expect, it } from "vitest";
import {
  parseJobForm,
  slugifyJobTitle,
  validateJobInput,
} from "@/app/(portal)/(admin)/admin/careers/_components/job-form-parse";

describe("career job form", () => {
  it("creates stable URL slugs", () => expect(slugifyJobTitle("Médico — Remote! ")).toBe("medico-remote"));
  it("treats closing input explicitly as UTC", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({ countryId: "ie", locale: "en", slug: "doctor", title: "Doctor", department: "Medical", location: "Remote", workplaceMode: "REMOTE", employmentType: "Contract", descriptionHtml: "<p>Role</p>", status: "DRAFT", closesAt: "2026-12-01T17:30" })) form.set(key, value);
    const parsed = parseJobForm(form);
    expect(parsed.closesAt).toBe("2026-12-01T17:30:00.000Z");
    expect(validateJobInput(parsed)).toBeNull();
  });

  it.each([
    ["locale", "KLINGON"],
    ["workplaceMode", "ANYWHERE"],
    ["status", "DELETED"],
  ])("rejects an unsupported %s value", (field, value) => {
    const form = new FormData();
    for (const [key, fieldValue] of Object.entries({
      countryId: "ie", locale: "en", slug: "doctor", title: "Doctor",
      department: "Medical", location: "Remote", workplaceMode: "REMOTE",
      employmentType: "Contract", descriptionHtml: "<p>Role</p>", status: "DRAFT",
    })) form.set(key, fieldValue);
    form.set(field, value);
    expect(() => parseJobForm(form)).toThrow(`Invalid ${field}`);
  });
});

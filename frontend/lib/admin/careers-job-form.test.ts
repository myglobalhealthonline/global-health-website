import { describe, expect, it } from "vitest";
import {
  parseJobForm,
  slugifyJobTitle,
  validateJobInput,
} from "@/app/(portal)/(admin)/admin/careers/_components/job-form-parse";

describe("career job form", () => {
  it("creates stable URL slugs", () => expect(slugifyJobTitle("Médico — Remote! ")).toBe("medico-remote"));
  it("parses complete locale tabs and treats closing input explicitly as UTC", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      countryId: "ie", defaultLocale: "EN", slug: "doctor", workplaceMode: "REMOTE",
      status: "DRAFT", closesAt: "2026-12-01T17:30",
      tr_EN_title: "Doctor", tr_EN_department: "Medical", tr_EN_location: "Remote",
      tr_EN_employmentType: "Contract", tr_EN_descriptionHtml: "<p>Role</p>",
      tr_PT_title: "Médico", tr_PT_department: "Medicina", tr_PT_location: "Remoto",
      tr_PT_employmentType: "Contrato", tr_PT_descriptionHtml: "<p>Função</p>",
      tr_ES_descriptionHtml: "<p><br></p>",
    })) form.set(key, value);
    form.append("translationLocale", "EN");
    form.append("translationLocale", "PT");
    form.append("translationLocale", "ES");
    const parsed = parseJobForm(form);
    expect(parsed.closesAt).toBe("2026-12-01T17:30:00.000Z");
    expect(validateJobInput(parsed)).toBeNull();
    expect(parsed.localizations.map(({ locale }) => locale)).toEqual(["EN", "PT"]);
    expect(parsed.localizations[1]).toMatchObject({
      locale: "PT",
      title: "Médico",
    });
    expect(parsed).toMatchObject({ slug: "doctor", workplaceMode: "REMOTE" });
  });

  it.each([
    ["translationLocale", "KLINGON"],
    ["workplaceMode", "ANYWHERE"],
    ["status", "DELETED"],
  ])("rejects an unsupported %s value", (field, value) => {
    const form = new FormData();
    for (const [key, fieldValue] of Object.entries({
      countryId: "ie", defaultLocale: "EN", slug: "doctor", workplaceMode: "REMOTE",
      status: "DRAFT", tr_EN_title: "Doctor", tr_EN_department: "Medical",
      tr_EN_location: "Remote", tr_EN_employmentType: "Contract",
      tr_EN_descriptionHtml: "<p>Role</p>",
    })) form.set(key, fieldValue);
    form.append("translationLocale", field === "translationLocale" ? value : "EN");
    if (field !== "translationLocale") form.set(field, value);
    expect(() => parseJobForm(form)).toThrow();
  });

  it("requires the country default locale and rejects partially completed translations", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      countryId: "cz", defaultLocale: "CS", slug: "doctor", workplaceMode: "REMOTE",
      status: "DRAFT", tr_EN_title: "Doctor", tr_EN_department: "Medical",
      tr_EN_location: "Remote", tr_EN_employmentType: "Contract",
      tr_EN_descriptionHtml: "<p>Role</p>", tr_PT_title: "Médico",
    })) form.set(key, value);
    form.append("translationLocale", "CS");
    form.append("translationLocale", "EN");
    form.append("translationLocale", "PT");
    const parsed = parseJobForm(form);

    expect(validateJobInput(parsed)).toBe("Add the default Čeština translation.");
    expect(validateJobInput({ ...parsed, defaultLocale: "EN" })).toBe(
      "Complete all required fields for Português.",
    );
  });
});

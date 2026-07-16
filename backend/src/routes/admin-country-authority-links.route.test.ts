import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { updateTranslationSchema } from "./admin-country-authority-links.route.js";

// Pure zod-schema coverage for the new locale-branch PATCH payload — no DB
// access, so safe to run under the live-DB test guard.
describe("authority link translation PATCH schema", () => {
  it("requires locale", () => {
    const result = updateTranslationSchema.safeParse({ name: "Ordem dos Médicos" });
    assert.equal(result.success, false);
  });

  it("accepts locale-only payload (no fields to change)", () => {
    const result = updateTranslationSchema.safeParse({ locale: "PT" });
    assert.equal(result.success, true);
  });

  it("accepts the three translatable fields", () => {
    const result = updateTranslationSchema.safeParse({
      locale: "PT",
      name: "Ordem dos Médicos",
      abbreviation: "OM",
      description: "Regulador médico português",
    });
    assert.equal(result.success, true);
  });

  it("allows abbreviation/description to be cleared with null", () => {
    const result = updateTranslationSchema.safeParse({
      locale: "PT",
      abbreviation: null,
      description: null,
    });
    assert.equal(result.success, true);
  });

  it("rejects url/category/sortOrder — not translatable", () => {
    const result = updateTranslationSchema.safeParse({
      locale: "PT",
      url: "https://example.com",
    });
    assert.equal(result.success, false);
  });

  it("rejects an empty name (min length 1 when provided)", () => {
    const result = updateTranslationSchema.safeParse({ locale: "PT", name: "" });
    assert.equal(result.success, false);
  });
});

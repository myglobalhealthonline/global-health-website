import assert from "node:assert/strict";
import test from "node:test";
import { LocaleCode } from "@prisma/client";
import { resolveTranslation } from "./resolve-translation.js";

test("resolveTranslation returns requested locale when present", () => {
  const result = resolveTranslation(
    [
      { locale: LocaleCode.CS, label: "Czech" },
      { locale: LocaleCode.EN, label: "English" },
    ],
    LocaleCode.EN,
    LocaleCode.EN,
  );

  assert.equal(result.resolvedLocale, LocaleCode.EN);
  assert.deepEqual(result.tr, { locale: LocaleCode.EN, label: "English" });
});

test("resolveTranslation falls back to default locale when requested is missing", () => {
  const result = resolveTranslation(
    [
      { locale: LocaleCode.CS, label: "Czech" },
      { locale: LocaleCode.EN, label: "English" },
    ],
    LocaleCode.RO,
    LocaleCode.EN,
  );

  assert.equal(result.resolvedLocale, LocaleCode.EN);
  assert.deepEqual(result.tr, { locale: LocaleCode.EN, label: "English" });
});

test("resolveTranslation does not leak an unrelated locale when requested and default are missing", () => {
  const result = resolveTranslation(
    [{ locale: LocaleCode.CS, label: "Czech" }],
    LocaleCode.EN,
    LocaleCode.EN,
  );

  assert.equal(result.resolvedLocale, LocaleCode.EN);
  assert.equal(result.tr, null);
});

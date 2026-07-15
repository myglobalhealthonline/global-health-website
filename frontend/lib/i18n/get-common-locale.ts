import type { CommonLocale, LocaleCode } from "./types";
import { deepMergeLocale } from "./deep-merge-locale";
import enCommon from "@/locales/en/common.json";
import ptCommon from "@/locales/pt/common.json";
import esCommon from "@/locales/es/common.json";
import csCommon from "@/locales/cs/common.json";
import roCommon from "@/locales/ro/common.json";
import deCommon from "@/locales/de/common.json";

const commonLocales: Record<LocaleCode, CommonLocale> = {
  en: enCommon,
  pt: ptCommon,
  es: esCommon,
  cs: csCommon,
  ro: roCommon,
  de: deCommon,
};

// Module-level cache: each non-en locale is deep-merged over `en` once, not
// per request/render — missing keys fall back to English.
const mergedCommonCache = new Map<LocaleCode, CommonLocale>();

export function getCommonLocale(locale: LocaleCode): CommonLocale {
  if (locale === "en") return commonLocales.en;
  const cached = mergedCommonCache.get(locale);
  if (cached) return cached;
  const merged = deepMergeLocale(commonLocales.en, commonLocales[locale] ?? commonLocales.en);
  mergedCommonCache.set(locale, merged);
  return merged;
}

import type { CommonLocale, LocaleCode } from "./types";
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

export function getCommonLocale(locale: LocaleCode): CommonLocale {
  return commonLocales[locale] ?? commonLocales.en;
}

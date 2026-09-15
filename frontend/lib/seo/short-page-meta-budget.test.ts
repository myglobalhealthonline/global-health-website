import { describe, expect, it } from "vitest";
import enAuth from "@/locales/en/auth.json";
import ptAuth from "@/locales/pt/auth.json";
import esAuth from "@/locales/es/auth.json";
import csAuth from "@/locales/cs/auth.json";
import roAuth from "@/locales/ro/auth.json";
import deAuth from "@/locales/de/auth.json";
import enCommon from "@/locales/en/common.json";
import ptCommon from "@/locales/pt/common.json";
import esCommon from "@/locales/es/common.json";
import csCommon from "@/locales/cs/common.json";
import roCommon from "@/locales/ro/common.json";
import deCommon from "@/locales/de/common.json";
import { SEARCH_DESCRIPTION_LIMIT, SEARCH_DESCRIPTION_MIN } from "./page-seo";

/**
 * 2026-09-15 OpenSEO audit: /cart, /login, /register and /forgot-password
 * served 20-56 char descriptions (meta-description-too-short), and `/` served
 * 92 words (thin-content). These pages stay noindex; the copy must still fit.
 */
const AUTH = { en: enAuth, pt: ptAuth, es: esAuth, cs: csAuth, ro: roAuth, de: deAuth };
const COMMON = { en: enCommon, pt: ptCommon, es: esCommon, cs: csCommon, ro: roCommon, de: deCommon };
const chars = (value: string) => Array.from(value).length;

const rows = Object.keys(AUTH).flatMap((locale) => {
  const auth = AUTH[locale as keyof typeof AUTH];
  const common = COMMON[locale as keyof typeof COMMON];
  return [
    { locale, page: "login", text: auth.login.metaDescription },
    { locale, page: "register", text: auth.register.metaDescription },
    { locale, page: "forgot-password", text: auth.forgotPassword.metaDescription },
    { locale, page: "cart", text: common.flow.cartMetaDescription },
  ];
});

describe("transactional page meta descriptions stay within 70-160 chars", () => {
  it.each(rows)("$locale $page", ({ text }) => {
    expect(chars(text)).toBeGreaterThanOrEqual(SEARCH_DESCRIPTION_MIN);
    expect(chars(text)).toBeLessThanOrEqual(SEARCH_DESCRIPTION_LIMIT);
  });
});

describe("country picker carries its about copy in every locale", () => {
  it.each(Object.entries(COMMON))("%s", (_locale, common) => {
    const { aboutTitle, aboutBody1, aboutBody2 } = common.entryGate;
    expect(aboutTitle.trim()).not.toBe("");
    expect(`${aboutBody1} ${aboutBody2}`.split(/\s+/u).length).toBeGreaterThanOrEqual(120);
  });
});

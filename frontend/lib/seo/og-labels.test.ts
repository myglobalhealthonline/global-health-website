import { describe, expect, it } from "vitest";
import { getOgLabel } from "@/lib/seo/og-labels";

describe("getOgLabel", () => {
  it.each([
    ["en_IE", "MEET YOUR DOCTOR"],
    ["pt_BR", "CONHEÇA SEU MÉDICO"],
    ["es-ES", "CONOCE A TU MÉDICO"],
    ["cs_CZ", "POZNEJTE SVÉHO LÉKAŘE"],
    ["ro_RO", "CUNOAȘTEȚI MEDICUL DVS."],
    ["de-DE", "IHR ARZT IM PORTRÄT"],
  ])("localizes doctor labels for %s", (locale, expected) => {
    expect(getOgLabel("doctor", locale)).toBe(expected);
  });

  it("normalizes locale case", () => {
    expect(getOgLabel("service", "PT_br")).toBe("SERVIÇO CLÍNICO");
  });

  it("falls back to English for missing or unsupported locales", () => {
    expect(getOgLabel("doctor", undefined)).toBe("MEET YOUR DOCTOR");
    expect(getOgLabel("doctor", "fr_FR")).toBe("MEET YOUR DOCTOR");
  });
});

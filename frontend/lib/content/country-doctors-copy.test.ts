import { describe, expect, it } from "vitest";
import cs from "@/locales/cs/common.json";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";
import pt from "@/locales/pt/common.json";

import { doctorDirectorySeo, overrideDoctorsBundle } from "./country-doctors-copy";

describe("Czech doctor-directory copy", () => {
  it("removes same-day and blanket-verification claims only for cz:cs", () => {
    const base = cs.doctors;
    const czech = overrideDoctorsBundle(base, "cz", "cs");
    const portugalCzech = overrideDoctorsBundle(base, "pt", "cs");

    expect(JSON.stringify(czech)).not.toMatch(/ve stejný den|ještě dnes|většina termínů do 24 hodin/i);
    expect(czech.heroLedeTemplate).toMatch(/registrační údaje/i);
    expect(portugalCzech.bottomCtaAccent).toBe(base.bottomCtaAccent);
    expect(portugalCzech.floatCard1Subtitle).toBe(base.floatCard1Subtitle);
  });
});

describe("Brazil doctor-directory copy", () => {
  const bundles = { pt, en, es } as const;

  it("removes same-day wording for br pt/en/es and leaves Portugal unchanged", () => {
    for (const [lang, locale] of Object.entries(bundles)) {
      const brazil = overrideDoctorsBundle(locale.doctors, "br", lang);
      const seo = doctorDirectorySeo("br", lang);
      const text = JSON.stringify({ brazil, seo });
      expect(text).not.toMatch(/mesmo dia|same-day|same day|mismo día|hoje|today|hoy|24 hora|24 hour|Paliativ|Palliative/i);
      expect(seo?.description.length).toBeLessThanOrEqual(160);
      const portugal = overrideDoctorsBundle(locale.doctors, "pt", lang);
      expect(portugal.trustCard3Title).toBe(locale.doctors.trustCard3Title);
      expect(portugal.bottomCtaAccent).toBe(locale.doctors.bottomCtaAccent);
      expect(doctorDirectorySeo("pt", lang)).toBeNull();
    }
  });
});

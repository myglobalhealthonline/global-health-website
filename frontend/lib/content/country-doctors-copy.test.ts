import { describe, expect, it } from "vitest";
import cs from "@/locales/cs/common.json";

import { overrideDoctorsBundle } from "./country-doctors-copy";

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

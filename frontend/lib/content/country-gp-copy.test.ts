import { describe, expect, it } from "vitest";

import { countryGpFeature3Subtitle } from "./country-gp-copy";

describe("countryGpFeature3Subtitle", () => {
  it("removes the same-day promise only from Czechia Czech", () => {
    expect(countryGpFeature3Subtitle("cz", "cs", "shared")).toBe(
      "Termíny se zobrazují podle aktuální dostupnosti.",
    );
    expect(countryGpFeature3Subtitle("cz", "en", "shared")).toBe("shared");
    expect(countryGpFeature3Subtitle("ie", "cs", "shared")).toBe("shared");
  });
});

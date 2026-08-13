import { describe, expect, it } from "vitest";
import { summarizeLanguagesForMetadata } from "@/lib/seo/doctor-language-summary";

describe("summarizeLanguagesForMetadata", () => {
  it("0 languages: falls back to English", () => {
    expect(summarizeLanguagesForMetadata([])).toBe("English");
  });

  it("1 language", () => {
    expect(summarizeLanguagesForMetadata(["English"])).toBe("English");
  });

  it("2 languages", () => {
    expect(summarizeLanguagesForMetadata(["English", "Spanish"])).toBe("English and Spanish");
  });

  it("3 languages", () => {
    expect(summarizeLanguagesForMetadata(["English", "Spanish", "Portuguese"])).toBe(
      "English, Spanish and Portuguese",
    );
  });

  it("4 languages: first 3 + count of the rest", () => {
    expect(summarizeLanguagesForMetadata(["English", "Spanish", "Portuguese", "Czech"])).toBe(
      "English, Spanish, Portuguese +1 more",
    );
  });

  it("5+ languages: first 3 + count of the rest", () => {
    expect(
      summarizeLanguagesForMetadata(["English", "Spanish", "Portuguese", "Czech", "Arabic"]),
    ).toBe("English, Spanish, Portuguese +2 more");
  });
});

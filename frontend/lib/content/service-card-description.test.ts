import { describe, expect, it } from "vitest";
import { serviceCardDescription } from "./service-card-description";

describe("serviceCardDescription", () => {
  it("prefers the service's own summary", () => {
    expect(serviceCardDescription("  Own summary ", "<p>Hero</p>")).toBe("Own summary");
  });

  it("falls back to the stripped hero lede when summary is null", () => {
    expect(serviceCardDescription(null, "<p>Habla con un <strong>médico</strong>&nbsp;hoy.</p>")).toBe(
      "Habla con un médico hoy.",
    );
  });

  it("cuts a long hero lede at a word boundary with an ellipsis", () => {
    const out = serviceCardDescription("", `<p>${"palabra ".repeat(40)}</p>`)!;
    expect(out.endsWith("palabra…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(161);
  });

  it("skips a summary that fell back to the market default language", () => {
    const fields = ["name", "heroTitle", "heroDescription"];
    expect(serviceCardDescription("Valoración médica", "<p>Choose an appointment.</p>", fields)).toBe(
      "Choose an appointment.",
    );
  });

  it("returns null when neither field has text in the requested locale", () => {
    expect(serviceCardDescription(null, "<p>&nbsp;</p>")).toBeNull();
    expect(serviceCardDescription("Resumen", "<p>Hero</p>", ["name"])).toBeNull();
  });
});

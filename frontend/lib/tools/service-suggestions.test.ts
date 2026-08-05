import { describe, expect, it } from "vitest";
import { toolSlugsForService } from "@/lib/tools/service-suggestions";

/**
 * Guards the service-page → calculator links. If this breaks, the tools go
 * back to being reachable only from the header dropdown and the footer, which
 * is what left all 198 of them "Discovered - currently not indexed".
 *
 * Slugs below are the real ones from the live per-country catalogue.
 */
describe("toolSlugsForService", () => {
  it("links BMI from each market's weight service", () => {
    for (const slug of [
      "weight-management-consultation", // ie/en
      "perda-de-peso", // pt
      "control-peso-online", // es
      "controle-peso-online", // br
    ]) {
      expect(toolSlugsForService({ slug, name: "" })).toContain("bmi-calculator");
    }
  });

  /**
   * These four were silently unmatched until 2026-08-06: the tables carried
   * dictionary forms ("vaha", "greutate", "psych") that none of the live
   * inflected slugs contain. Czechia and Romania therefore looked like they
   * had no weight service at all, and their BMI pages fell through to the GP
   * link. Both directions read the same tables, so this covers the tool-page
   * suggestions too.
   */
  it("matches inflected, non-English service names", () => {
    const cases: Array<[string, string, string]> = [
      ["kontrola-vahy-online", "Hubnutí s lékařem online", "bmi-calculator"], // cz
      ["controlul-greutatii", "Managementul greutății", "bmi-calculator"], // ro
      ["sanatate-mintala-online", "Evaluare de sănătate mintală", "adhd-test"], // ro
      ["psicologo-online", "Psicología Clínica", "adhd-test"], // es
    ];
    for (const [slug, name, expected] of cases) {
      expect(toolSlugsForService({ slug, name })).toContain(expected);
    }
  });

  it("links both pregnancy tools from a women's health service", () => {
    expect(toolSlugsForService({ slug: "womens-health-consultation", name: "" })).toEqual([
      "due-date-calculator",
      "ovulation-calculator",
    ]);
  });

  /**
   * One entry per market's live women's-health slug. Spain's
   * `salud-femenina-online` matched nothing until 2026-08-06 — "femei" is the
   * Romanian stem and has an i where Spanish has an n — so Spain was the only
   * market linking neither pregnancy calculator.
   */
  it("matches every market's women's-health service", () => {
    for (const slug of [
      "womens-health-consultation", // ie
      "saude-da-mulher-online", // br
      "saude-da-mulher", // pt
      "salud-femenina-online", // es
      "zenske-zdravi-online", // cz
      "sanatatea-femeii-online", // ro
    ]) {
      expect(toolSlugsForService({ slug, name: "" })).toContain("due-date-calculator");
    }
  });

  it("matches on the service NAME when the slug carries no topic term", () => {
    expect(
      toolSlugsForService({ slug: "consulta-online-123", name: "Consulta de cardiologia" }),
    ).toEqual(["blood-pressure-chart"]);
  });

  /**
   * A tool may legitimately have more than one host. `blood-pressure-chart` is
   * `["chronic", "cardio", "gp"]` — hypertension is managed in long-term
   * condition care and referred on to cardiology — and it belongs on both
   * pages. Reading only the first slot silently dropped every cardiology page
   * the moment "chronic" was put in front of it.
   */
  it("links a tool from every one of its slots, not just the primary", () => {
    for (const slug of ["chronic-disease-consultation", "cardiology-specialist-consultation"]) {
      expect(toolSlugsForService({ slug, name: "" })).toContain("blood-pressure-chart");
    }
  });

  it("ranks a primary-slot match above a fallback-slot match", () => {
    // Nutrition is calorie's slot 0 and BMI's slot 1, so calorie leads.
    expect(toolSlugsForService({ slug: "nutrition-specialist-consultation", name: "" })[0]).toBe(
      "calorie-calculator",
    );
    // Weight is BMI's slot 0 and calorie's slot 1, so BMI leads.
    expect(toolSlugsForService({ slug: "weight-management-consultation", name: "" })[0]).toBe(
      "bmi-calculator",
    );
  });

  it("is accent-insensitive", () => {
    expect(toolSlugsForService({ slug: "consulta-nutricao", name: "Nutrição" })).toContain(
      "calorie-calculator",
    );
  });

  it("returns nothing for an unrelated service, rather than a default link", () => {
    expect(toolSlugsForService({ slug: "dermatology-consultation", name: "" })).toEqual([]);
  });

  it("never returns more than two links", () => {
    // Matches weight, nutrition, cardio and mental terms at once.
    const many = toolSlugsForService({
      slug: "weight-nutrition-cardio-psych",
      name: "",
    });
    expect(many.length).toBeLessThanOrEqual(2);
  });
});

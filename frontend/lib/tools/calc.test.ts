import { describe, expect, it } from "vitest";
import {
  ADHD_QUESTIONS,
  adhdScore,
  bmi,
  bmiBand,
  bmiGaugePercent,
  bmr,
  bpCategory,
  calorieTargets,
  dueDateFromLmp,
  healthyWeightRange,
  osteoporosisRiskTier,
  ovulationFromLmp,
  parseISODate,
  tdee,
  weightToHealthyRange,
} from "./calc";
import {
  suggestionForBand,
  type ServiceSuggestion,
} from "./service-suggestions";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const at = (s: string) => parseISODate(s)!;

describe("bmi", () => {
  it("matches the worked example on the page", () => {
    expect(bmi(78, 175)).toBe(25.5);
  });

  it("rejects unusable input instead of returning Infinity/NaN", () => {
    expect(bmi(0, 175)).toBeNull();
    expect(bmi(78, 0)).toBeNull();
    expect(bmi(Number.NaN, 175)).toBeNull();
  });
});

describe("bmiBand", () => {
  it("puts each WHO boundary in the band that starts at it", () => {
    expect(bmiBand(18.4).key).toBe("underweight");
    expect(bmiBand(18.5).key).toBe("healthy");
    expect(bmiBand(24.9).key).toBe("healthy");
    expect(bmiBand(25).key).toBe("overweight");
    expect(bmiBand(30).key).toBe("obese-1");
    expect(bmiBand(35).key).toBe("obese-2");
    expect(bmiBand(40).key).toBe("obese-3");
    expect(bmiBand(70).key).toBe("obese-3");
  });
});

describe("healthyWeightRange", () => {
  it("brackets the healthy band for a 1.75 m adult", () => {
    expect(healthyWeightRange(175)).toEqual({ min: 56.7, max: 76.3 });
  });
});

describe("weightToHealthyRange", () => {
  it("signs the gap: positive above the band, negative below, zero inside", () => {
    expect(weightToHealthyRange(86.3, 175)).toBe(10);
    expect(weightToHealthyRange(50.7, 175)).toBe(-6);
    expect(weightToHealthyRange(70, 175)).toBe(0);
  });
});

describe("bmiGaugePercent", () => {
  it("maps the plotted range onto 0-100 and pins outside it", () => {
    expect(bmiGaugePercent(15)).toBe(0);
    expect(bmiGaugePercent(40)).toBe(100);
    expect(bmiGaugePercent(27.5)).toBe(50);
    expect(bmiGaugePercent(9)).toBe(0);
    expect(bmiGaugePercent(65)).toBe(100);
  });
});

describe("bmr / tdee", () => {
  // 10*80 + 6.25*180 - 5*30 = 1775; +5 male, -161 female.
  it("applies the Mifflin-St Jeor sex term", () => {
    expect(bmr({ sex: "male", weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
    expect(bmr({ sex: "female", weightKg: 80, heightCm: 180, age: 30 })).toBe(1614);
  });

  it("multiplies by the chosen activity level", () => {
    expect(tdee(1780, "sedentary")).toBe(2136);
    expect(tdee(1780, "moderate")).toBe(2759);
  });
});

describe("calorieTargets", () => {
  it("never suggests an unsupervised intake below 1,200 kcal", () => {
    const low = calorieTargets(1500);
    expect(low.loss).toBe(1200);
    expect(low.floored).toBe(true);

    const normal = calorieTargets(2400);
    expect(normal.loss).toBe(1900);
    expect(normal.floored).toBe(false);
  });
});

describe("bpCategory", () => {
  it("classifies the canonical readings", () => {
    expect(bpCategory(115, 75)?.key).toBe("optimal");
    expect(bpCategory(125, 82)?.key).toBe("normal");
    expect(bpCategory(135, 86)?.key).toBe("high-normal");
    expect(bpCategory(145, 92)?.key).toBe("grade-1");
    expect(bpCategory(165, 104)?.key).toBe("grade-2");
    expect(bpCategory(185, 115)?.key).toBe("grade-3");
    expect(bpCategory(85, 55)?.key).toBe("low");
  });

  it("takes the higher category when the two numbers disagree", () => {
    // Diastolic alone is in grade 2 — must not be reported as normal.
    expect(bpCategory(125, 105)?.key).toBe("grade-2");
    // Raised systolic with a normal diastolic is its own named category.
    expect(bpCategory(150, 80)?.key).toBe("isolated-systolic");
  });

  it("flags a hypertensive crisis as urgent", () => {
    expect(bpCategory(182, 84)?.urgent).toBe(true);
    expect(bpCategory(140, 90)?.urgent).toBeUndefined();
  });

  it("rejects impossible readings rather than guessing", () => {
    expect(bpCategory(80, 120)).toBeNull();
    expect(bpCategory(0, 80)).toBeNull();
  });
});

describe("parseISODate", () => {
  it("rejects calendar-invalid dates that Date.UTC would roll over", () => {
    expect(parseISODate("2026-02-31")).toBeNull();
    expect(parseISODate("not-a-date")).toBeNull();
    expect(iso(parseISODate("2026-02-28")!)).toBe("2026-02-28");
  });
});

describe("dueDateFromLmp", () => {
  it("adds 280 days for a 28-day cycle", () => {
    const result = dueDateFromLmp(at("2026-01-01"), 28, at("2026-01-01"));
    expect(iso(result.dueDate)).toBe("2026-10-08");
  });

  it("shifts the due date by the cycle-length difference", () => {
    expect(iso(dueDateFromLmp(at("2026-01-01"), 32, at("2026-01-01")).dueDate)).toBe("2026-10-12");
    expect(iso(dueDateFromLmp(at("2026-01-01"), 24, at("2026-01-01")).dueDate)).toBe("2026-10-04");
  });

  it("reports gestational age and trimester as of today", () => {
    const result = dueDateFromLmp(at("2026-01-01"), 28, at("2026-03-05"));
    expect(result.gestationalDays).toBe(63);
    expect(result.weeks).toBe(9);
    expect(result.days).toBe(0);
    expect(result.trimester).toBe(1);
    expect(result.outOfRange).toBe(false);
  });

  it("flags dates before the LMP and past 42 weeks", () => {
    expect(dueDateFromLmp(at("2026-06-01"), 28, at("2026-01-01")).outOfRange).toBe(true);
    expect(dueDateFromLmp(at("2025-01-01"), 28, at("2026-01-01")).outOfRange).toBe(true);
  });
});

describe("ovulationFromLmp", () => {
  it("puts ovulation 14 days before the next period, not 14 days after the LMP", () => {
    const long = ovulationFromLmp(at("2026-01-01"), 35);
    expect(iso(long.nextPeriod)).toBe("2026-02-05");
    expect(iso(long.ovulation)).toBe("2026-01-22"); // day 21, not day 14
    expect(iso(long.fertileStart)).toBe("2026-01-17");
  });

  it("gives the classic day-14 answer on a 28-day cycle", () => {
    expect(iso(ovulationFromLmp(at("2026-01-01"), 28).ovulation)).toBe("2026-01-15");
  });
});

describe("adhdScore", () => {
  const answers = (...values: Array<number | null>) => adhdScore(values);

  it("uses the per-item ASRS thresholds, not one flat cut-off", () => {
    // "Sometimes" (2) counts for items 1-3 but not for items 4-6.
    expect(answers(2, 2, 2, 2, 2, 2).positives).toBe(3);
    expect(answers(0, 0, 0, 3, 3, 3).positives).toBe(3);
  });

  it("screens positive at four or more", () => {
    expect(answers(2, 2, 2, 3, 0, 0).screenPositive).toBe(true);
    expect(answers(2, 2, 2, 2, 2, 2).screenPositive).toBe(false);
  });

  it("counts only answered items", () => {
    const partial = answers(4, 4, null, null, null, null);
    expect(partial.answered).toBe(2);
    expect(partial.positives).toBe(2);
    expect(partial.screenPositive).toBe(false);
  });

  it("keeps the question list and the scorer in step", () => {
    expect(ADHD_QUESTIONS).toHaveLength(6);
  });
});

describe("osteoporosisRiskTier", () => {
  const base = {
    age: 40,
    sex: "female" as const,
    heightCm: 170,
    weightKg: 70,
    priorFragilityFracture: false,
    glucocorticoids: false,
    parentalHipFracture: false,
    currentSmoker: false,
    heavyAlcohol: false,
    rheumatoidArthritis: false,
    secondaryCause: false,
    falls: false,
    earlyMenopause: false,
  };

  it("flags nothing for a young adult with no risk factors", () => {
    const result = osteoporosisRiskTier(base);
    expect(result.tier).toBe("no-flags");
    expect(result.majorCount).toBe(0);
    expect(result.contributingCount).toBe(0);
  });

  it("recommends assessment now at the guideline age threshold, per sex", () => {
    expect(osteoporosisRiskTier({ ...base, sex: "female", age: 65 }).tier).toBe("assess-now");
    expect(osteoporosisRiskTier({ ...base, sex: "female", age: 64 }).tier).toBe("no-flags");
    expect(osteoporosisRiskTier({ ...base, sex: "male", age: 75 }).tier).toBe("assess-now");
    expect(osteoporosisRiskTier({ ...base, sex: "male", age: 74 }).tier).toBe("no-flags");
  });

  it("recommends assessment for a major factor at any age, even under 50", () => {
    expect(osteoporosisRiskTier({ ...base, age: 25, glucocorticoids: true }).tier).toBe(
      "assess-now",
    );
    expect(osteoporosisRiskTier({ ...base, age: 25, priorFragilityFracture: true }).tier).toBe(
      "assess-now",
    );
  });

  it("only sends a contributing-only case to 'discuss next', never 'assess now'", () => {
    const result = osteoporosisRiskTier({ ...base, currentSmoker: true, falls: true });
    expect(result.tier).toBe("discuss-next");
    expect(result.majorCount).toBe(0);
    expect(result.contributingCount).toBe(2);
  });

  it("counts a low BMI as a contributing factor", () => {
    const result = osteoporosisRiskTier({ ...base, heightCm: 170, weightKg: 50 });
    expect(result.tier).toBe("discuss-next");
    expect(result.contributingCount).toBe(1);
  });

  it("only scores early menopause for women", () => {
    expect(
      osteoporosisRiskTier({ ...base, sex: "male", age: 40, earlyMenopause: true })
        .contributingCount,
    ).toBe(0);
    expect(
      osteoporosisRiskTier({ ...base, sex: "female", age: 40, earlyMenopause: true })
        .contributingCount,
    ).toBe(1);
  });
});

describe("suggestionForBand", () => {
  const card = (slot: ServiceSuggestion["slot"], title: string, path: string): ServiceSuggestion => ({
    slot,
    title,
    detailHref: path,
    bookHref: `${path}/book`,
  });
  const weight = card("weight", "W", "/w");
  const nutrition = card("nutrition", "N", "/n");
  const gp = card("gp", "", "/gp");
  const all = [weight, nutrition, gp];

  it("never upsells weight or nutrition to an underweight result", () => {
    expect(suggestionForBand("underweight", all)).toBe(gp);
  });

  it("sends a healthy result to nutrition, not weight loss", () => {
    expect(suggestionForBand("healthy", all)).toBe(nutrition);
  });

  it("sends overweight and obese results to weight management", () => {
    expect(suggestionForBand("overweight", all)).toBe(weight);
    expect(suggestionForBand("obese-1", all)).toBe(weight);
    expect(suggestionForBand("obese-3", all)).toBe(weight);
  });

  it("falls back down the chain when a market lacks a service", () => {
    // Czechia and Romania have no weight service today — must land on GP.
    expect(suggestionForBand("obese-1", [gp])).toBe(gp);
    expect(suggestionForBand("healthy", [gp])).toBe(gp);
  });

  it("returns null rather than throwing when there is nothing to suggest", () => {
    expect(suggestionForBand("healthy", [])).toBeNull();
    expect(suggestionForBand("healthy", undefined)).toBeNull();
  });
});

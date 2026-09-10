/**
 * Pure maths behind the free health tools. No React, no DOM — so the widgets
 * stay dumb and the arithmetic is unit-testable (see `calc.test.ts`).
 *
 * Every date function works in whole UTC days: the inputs are `yyyy-mm-dd`
 * strings from a native date input, and a local-time Date would shift the
 * result by a day either side of a DST boundary.
 */

import type { ToneKey } from "@/lib/tools/registry";

export const KG_PER_STONE = 6.35029318;
export const KG_PER_POUND = 0.45359237;
export const CM_PER_INCH = 2.54;
export const CM_PER_FOOT = 30.48;

/* ------------------------------------------------------------------ BMI */

/**
 * Bands carry a KEY and a tone, never a label — every user-facing string for
 * the tools lives in `locales/<lang>/tools.json` so the pages can ship in all six
 * site languages. Anything that returns prose from here would be untranslatable.
 */
export type BmiBandKey =
  | "underweight"
  | "healthy"
  | "overweight"
  | "obese-1"
  | "obese-2"
  | "obese-3";

export type BmiBand = { key: BmiBandKey; tone: ToneKey };

/** `min` is inclusive, `max` exclusive — the WHO bands, in order. */
export const BMI_BANDS: Array<BmiBand & { min: number; max: number }> = [
  { min: 0, max: 18.5, key: "underweight", tone: "warn" },
  { min: 18.5, max: 25, key: "healthy", tone: "good" },
  { min: 25, max: 30, key: "overweight", tone: "warn" },
  { min: 30, max: 35, key: "obese-1", tone: "alert" },
  { min: 35, max: 40, key: "obese-2", tone: "alert" },
  { min: 40, max: Infinity, key: "obese-3", tone: "alert" },
];

/** Ends of the plotted gauge. Below/above these the marker simply pins. */
export const BMI_GAUGE_MIN = 15;
export const BMI_GAUGE_MAX = 40;

/** Where a BMI sits on the gauge, as a 0–100 percentage. */
export function bmiGaugePercent(value: number): number {
  const span = BMI_GAUGE_MAX - BMI_GAUGE_MIN;
  const clamped = Math.min(BMI_GAUGE_MAX, Math.max(BMI_GAUGE_MIN, value));
  return ((clamped - BMI_GAUGE_MIN) / span) * 100;
}

/** BMI in kg/m², rounded to one decimal. Returns null for unusable input. */
export function bmi(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm)) return null;
  if (weightKg <= 0 || heightCm <= 0) return null;
  const metres = heightCm / 100;
  return Math.round((weightKg / (metres * metres)) * 10) / 10;
}

/** WHO adult band for a BMI value. Boundaries are inclusive at the bottom. */
export function bmiBand(value: number): BmiBand {
  const band = BMI_BANDS.find((b) => value < b.max) ?? BMI_BANDS[BMI_BANDS.length - 1];
  return { key: band.key, tone: band.tone };
}

/** Healthy-weight range (kg) for a given height, to one decimal. */
export function healthyWeightRange(heightCm: number): { min: number; max: number } | null {
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null;
  const metres = heightCm / 100;
  const round = (n: number) => Math.round(n * 10) / 10;
  return { min: round(18.5 * metres * metres), max: round(24.9 * metres * metres) };
}

/**
 * How far the current weight is from the healthy band, in kg. Negative means
 * "below the band", positive "above it", zero means already inside it — the
 * number people actually want after seeing a category.
 */
export function weightToHealthyRange(weightKg: number, heightCm: number): number | null {
  const range = healthyWeightRange(heightCm);
  if (!range || !Number.isFinite(weightKg) || weightKg <= 0) return null;
  if (weightKg > range.max) return Math.round((weightKg - range.max) * 10) / 10;
  if (weightKg < range.min) return -Math.round((range.min - weightKg) * 10) / 10;
  return 0;
}

/* -------------------------------------------------------------- Calories */

export type Sex = "male" | "female";

/** Keys + multipliers only; the labels come from `tools.json`. */
export const ACTIVITY_LEVELS = [
  { key: "sedentary", multiplier: 1.2 },
  { key: "light", multiplier: 1.375 },
  { key: "moderate", multiplier: 1.55 },
  { key: "very", multiplier: 1.725 },
  { key: "extra", multiplier: 1.9 },
] as const;

export type ActivityKey = (typeof ACTIVITY_LEVELS)[number]["key"];

/** Mifflin-St Jeor basal metabolic rate, kcal/day. */
export function bmr(input: { sex: Sex; weightKg: number; heightCm: number; age: number }): number | null {
  const { sex, weightKg, heightCm, age } = input;
  if (![weightKg, heightCm, age].every((n) => Number.isFinite(n) && n > 0)) return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(base + (sex === "male" ? 5 : -161));
}

export function tdee(bmrValue: number, activity: ActivityKey): number {
  const level = ACTIVITY_LEVELS.find((l) => l.key === activity) ?? ACTIVITY_LEVELS[0];
  return Math.round(bmrValue * level.multiplier);
}

/**
 * Maintenance plus the two targets people actually come for. The mild loss
 * figure is floored at 1,200 kcal — below that an adult intake should be
 * medically supervised, and a calculator should not casually suggest it.
 */
export function calorieTargets(maintenance: number) {
  return {
    maintain: maintenance,
    mildLoss: Math.max(1200, Math.round(maintenance - 250)),
    loss: Math.max(1200, Math.round(maintenance - 500)),
    gain: Math.round(maintenance + 300),
    /** True when the deficit target hit the 1,200 kcal floor. */
    floored: maintenance - 500 < 1200,
  };
}

/* -------------------------------------------------------- Blood pressure */

export type BpCategoryKey =
  | "low"
  | "optimal"
  | "normal"
  | "high-normal"
  | "grade-1"
  | "isolated-systolic"
  | "grade-2"
  | "grade-3";

export type BpCategory = {
  key: BpCategoryKey;
  tone: ToneKey;
  /** Set when the reading needs same-day or emergency contact. */
  urgent?: boolean;
};

/**
 * European (ESC/ESH) adult classification. When systolic and diastolic fall
 * in different categories, the HIGHER category wins — that is the rule in the
 * guideline, and getting it backwards would under-call real hypertension.
 */
export function bpCategory(systolic: number, diastolic: number): BpCategory | null {
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return null;
  if (systolic <= 0 || diastolic <= 0) return null;
  if (systolic <= diastolic) return null;

  if (systolic >= 180 || diastolic >= 110) return { key: "grade-3", tone: "alert", urgent: true };
  if (systolic >= 160 || diastolic >= 100) return { key: "grade-2", tone: "alert" };
  if (systolic >= 140 || diastolic >= 90) {
    // Raised top number with a normal bottom one is its own named entity, and
    // patients search for it by that name.
    return systolic >= 140 && diastolic < 90
      ? { key: "isolated-systolic", tone: "warn" }
      : { key: "grade-1", tone: "warn" };
  }
  if (systolic >= 130 || diastolic >= 85) return { key: "high-normal", tone: "warn" };
  if (systolic >= 120 || diastolic >= 80) return { key: "normal", tone: "good" };
  if (systolic < 90 || diastolic < 60) return { key: "low", tone: "muted" };
  return { key: "optimal", tone: "good" };
}

/* ------------------------------------------------------------ Date maths */

const DAY_MS = 86_400_000;

/** `yyyy-mm-dd` → UTC-midnight Date. Null for anything unparseable. */
export function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  // Rejects 2026-02-31 and friends, which Date.UTC would happily roll over.
  if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null;
  return date;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/** Today at UTC midnight — the reference point for "how far along am I". */
export function todayUTC(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/* ------------------------------------------------------------- Due date */

export type DueDateResult = {
  dueDate: Date;
  /** Days since the LMP as of `today`; negative before the LMP. */
  gestationalDays: number;
  weeks: number;
  days: number;
  trimester: 1 | 2 | 3 | null;
  secondTrimesterStart: Date;
  thirdTrimesterStart: Date;
  termStart: Date;
  /** True once the pregnancy is dated beyond 42 weeks or before the LMP. */
  outOfRange: boolean;
};

/**
 * Naegele's rule (LMP + 280 days) with the standard cycle-length adjustment:
 * ovulation shifts by however far the cycle differs from 28 days.
 */
export function dueDateFromLmp(
  lmp: Date,
  cycleLength = 28,
  today: Date = todayUTC(),
): DueDateResult {
  const clamped = Math.min(45, Math.max(20, Math.round(cycleLength)));
  const dueDate = addDays(lmp, 280 + (clamped - 28));
  const gestationalDays = daysBetween(lmp, today);
  const weeks = Math.floor(gestationalDays / 7);
  const days = ((gestationalDays % 7) + 7) % 7;
  const trimester =
    gestationalDays < 0 ? null : weeks < 14 ? 1 : weeks < 28 ? 2 : 3;
  return {
    dueDate,
    gestationalDays,
    weeks,
    days,
    trimester,
    secondTrimesterStart: addDays(lmp, 14 * 7),
    thirdTrimesterStart: addDays(lmp, 28 * 7),
    termStart: addDays(lmp, 37 * 7),
    outOfRange: gestationalDays < 0 || weeks > 42,
  };
}

/* ------------------------------------------------------------ Ovulation */

export type OvulationResult = {
  nextPeriod: Date;
  ovulation: Date;
  fertileStart: Date;
  fertileEnd: Date;
  testFrom: Date;
};

/**
 * Ovulation is anchored to the NEXT period, not the last one: the luteal
 * phase is roughly fixed at 14 days whatever the cycle length, so counting
 * forward from the LMP would mis-time every non-28-day cycle.
 *
 * Fertile window = the five days before ovulation plus ovulation day (sperm
 * survive up to five days; the egg lasts under one).
 */
export function ovulationFromLmp(lmp: Date, cycleLength = 28): OvulationResult {
  const clamped = Math.min(45, Math.max(20, Math.round(cycleLength)));
  const nextPeriod = addDays(lmp, clamped);
  const ovulation = addDays(nextPeriod, -14);
  return {
    nextPeriod,
    ovulation,
    fertileStart: addDays(ovulation, -5),
    fertileEnd: ovulation,
    testFrom: nextPeriod,
  };
}

/* ---------------------------------------------------------- Osteoporosis */

/**
 * Case-finding tier — NOT a probability, and NOT FRAX. This is who NICE
 * guideline CG146 ("Osteoporosis: assessing the risk of fragility fracture",
 * §1.1) says should be assessed for osteoporosis, which NOGG and ESCEO state
 * in materially the same terms:
 *
 *   - all women 65+ and all men 75+ should be assessed;
 *   - anyone younger should be assessed if they have a risk factor CG146
 *     lists — a prior fragility fracture or long-term (3+ months) oral
 *     glucocorticoids are the two the guideline treats as sufficient on
 *     their own, at any age;
 *   - the remaining CG146 risk factors (family history, smoking, heavy
 *     alcohol, rheumatoid arthritis, a secondary cause, recurrent falls,
 *     early menopause, low body weight) are worth a mention but do not by
 *     themselves trigger the guideline's assessment threshold.
 *
 * That is a simple MAJOR-vs-CONTRIBUTING rule, not a weighted score — there
 * is deliberately no points total here. A real probability needs a DXA
 * reading combined in a validated tool (FRAX, run by a clinician; or the
 * published Garvan nomogram / QFracture, neither implemented here).
 */
export type OsteoporosisTierKey = "assess-now" | "discuss-next" | "no-flags";

const OSTEOPOROSIS_AGE_THRESHOLD: Record<Sex, number> = { female: 65, male: 75 };
/** NICE CG146's own cited cut-off for low body weight as a risk factor. */
const OSTEOPOROSIS_LOW_BMI = 18.5;

export type OsteoporosisInput = {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  /** Wrist, hip, spine or arm, from a fall from standing height or less. */
  priorFragilityFracture: boolean;
  /** Oral glucocorticoids for 3 months or more. */
  glucocorticoids: boolean;
  parentalHipFracture: boolean;
  currentSmoker: boolean;
  /** 3 or more alcohol units a day. */
  heavyAlcohol: boolean;
  rheumatoidArthritis: boolean;
  /** e.g. an overactive thyroid, malabsorption, chronic liver/kidney disease. */
  secondaryCause: boolean;
  /** 2 or more falls in the past year. */
  falls: boolean;
  /** Only scored for women — see the guideline's own scope. */
  earlyMenopause: boolean;
};

export type OsteoporosisResult = {
  tier: OsteoporosisTierKey;
  majorCount: number;
  contributingCount: number;
  /** Total flagged, out of the 10 factors the chart table lists. */
  totalCount: number;
};

/** How many risk-factor rows the chart table renders — keeps the two in step. */
export const OSTEOPOROSIS_FACTOR_COUNT = 10;

export function osteoporosisRiskTier(input: OsteoporosisInput): OsteoporosisResult {
  const major = [input.priorFragilityFracture, input.glucocorticoids];

  const bodyMassIndex = bmi(input.weightKg, input.heightCm);
  const lowBodyWeight = bodyMassIndex !== null && bodyMassIndex < OSTEOPOROSIS_LOW_BMI;

  const contributing = [
    input.parentalHipFracture,
    input.currentSmoker,
    input.heavyAlcohol,
    input.rheumatoidArthritis,
    input.secondaryCause,
    input.falls,
    input.sex === "female" && input.earlyMenopause,
    lowBodyWeight,
  ];

  const majorCount = major.filter(Boolean).length;
  const contributingCount = contributing.filter(Boolean).length;

  const overAgeThreshold =
    Number.isFinite(input.age) && input.age >= OSTEOPOROSIS_AGE_THRESHOLD[input.sex];

  const tier: OsteoporosisTierKey =
    overAgeThreshold || majorCount > 0
      ? "assess-now"
      : contributingCount > 0
        ? "discuss-next"
        : "no-flags";

  return { tier, majorCount, contributingCount, totalCount: majorCount + contributingCount };
}

/* ----------------------------------------------------------------- ADHD */

/** Answer scale, low to high. Labels live in `tools.json`. */
export const ADHD_FREQUENCY_COUNT = 5;

/**
 * The six ASRS v1.1 Part A screening items, with the per-item threshold taken
 * from the scale's shaded boxes: items 1–3 count from "Sometimes" (index 2),
 * items 4–6 only from "Often" (index 3). A flat "4+ answers of Often" scoring —
 * the usual mistake — under-detects the inattentive presentation.
 *
 * The question wording itself is translated copy and lives in `tools.json`;
 * only the id and the threshold are logic.
 */
export const ADHD_QUESTIONS: Array<{ id: string; threshold: number }> = [
  { id: "q1", threshold: 2 },
  { id: "q2", threshold: 2 },
  { id: "q3", threshold: 2 },
  { id: "q4", threshold: 3 },
  { id: "q5", threshold: 3 },
  { id: "q6", threshold: 3 },
];

export type AdhdResult = { positives: number; answered: number; screenPositive: boolean };

/** `answers[i]` is an index into ADHD_FREQUENCIES, or null if unanswered. */
export function adhdScore(answers: Array<number | null>): AdhdResult {
  let positives = 0;
  let answered = 0;
  ADHD_QUESTIONS.forEach((question, index) => {
    const answer = answers[index];
    if (answer === null || answer === undefined) return;
    answered += 1;
    if (answer >= question.threshold) positives += 1;
  });
  return { positives, answered, screenPositive: positives >= 4 };
}

/* ---------------------------------------------------------- Sore throat */

/**
 * McIsaac score — Centor's four criteria plus the age term McIsaac added in
 * 1998 and revalidated in 2004. The age adjustment is the whole reason this,
 * rather than raw Centor, is safe to put in front of the public: strep
 * pharyngitis is common in school-age children and uncommon after 45, and
 * unadjusted Centor over-calls the second group and under-calls the first.
 *
 *   age 3–14  +1 · age 15–44  0 · age 45+  −1
 *   fever during this illness             +1
 *   NO cough                              +1
 *   tender, swollen glands at the front of the neck  +1
 *   white patches or swelling on the tonsils         +1
 *
 * Total runs −1 to 5.
 *
 * THREE THINGS THIS DELIBERATELY DOES NOT DO, and every one of them is a
 * safety decision rather than a scope decision:
 *
 * 1. It never says "no antibiotics needed". The score estimates how likely a
 *    sore throat is bacterial. A low score means UNLIKELY, not negative, and
 *    only a throat swab or rapid antigen test can say otherwise.
 * 2. Red flags short-circuit the score entirely (`redFlagOutcome`). A
 *    peritonsillar abscess or epiglottitis can present with a LOW McIsaac
 *    score — no fever yet, no exudate visible — so a reassuring band is
 *    exactly the wrong output. Presentation must branch on `scoreSuppressed`,
 *    never render a band alongside a red flag.
 * 3. It refuses to score under-3s. McIsaac was validated from age 3, strep is
 *    rare below it, and acute rheumatic fever essentially does not occur —
 *    a toddler with a sore throat needs looking at, not scoring.
 *
 * Centor's original two exam findings (exudate, tender nodes) are things a
 * clinician palpates and inspects. Self-reported, they are the weakest inputs
 * here, which is why the copy frames the output as "how likely" and the next
 * step as a consultation rather than a conclusion.
 */

/** Lowest age McIsaac was validated from. Below this the tool declines to score. */
export const SORE_THROAT_MIN_AGE = 3;

/** The four Centor criteria, excluding the age term. Drives the "n of 4" read-out. */
export const SORE_THROAT_CRITERIA_COUNT = 4;

export const MCISAAC_MIN = -1;
export const MCISAAC_MAX = 5;

/**
 * Grouped rather than one toggle per symptom: seven segmented controls would
 * bury the form, and the grouping matches how the answer differs. `airway` is
 * "go now", the other two are "be seen today" — over-triaging a scarlet-fever
 * rash to an emergency department is its own kind of harm.
 */
export type SoreThroatRedFlagKey = "airway" | "rash" | "immunosuppressed";

export type SoreThroatOutcomeKey =
  | "emergency"
  | "see-today"
  | "too-young"
  | "very-low"
  | "low"
  | "moderate"
  | "raised"
  | "high";

export type SoreThroatInput = {
  age: number;
  /** Fever, or felt feverish, at any point in this illness. */
  fever: boolean;
  /** True when there is NO cough — the criterion is the absence. */
  noCough: boolean;
  /** Tender, swollen glands at the front of the neck. */
  tenderNodes: boolean;
  /** White patches or visible swelling on the tonsils. */
  tonsillarExudate: boolean;
  /** Breathing, swallowing saliva, mouth-opening, muffled voice, neck stiffness. */
  airway: boolean;
  rash: boolean;
  immunosuppressed: boolean;
};

export type SoreThroatResult = {
  outcome: SoreThroatOutcomeKey;
  tone: ToneKey;
  /** McIsaac total, −1 to 5. Still computed when suppressed — never displayed then. */
  score: number;
  agePoints: number;
  /** How many of the four Centor criteria are met, 0–4. */
  criteriaMet: number;
  redFlags: SoreThroatRedFlagKey[];
  /**
   * True when the outcome came from a red flag or the age floor rather than
   * the score. The widget MUST hide the number and the band when this is set.
   */
  scoreSuppressed: boolean;
};

/** McIsaac's age term. Ages below `SORE_THROAT_MIN_AGE` never reach this. */
export function mcIsaacAgePoints(age: number): number {
  if (!Number.isFinite(age)) return 0;
  if (age < 15) return 1;
  if (age < 45) return 0;
  return -1;
}

const SORE_THROAT_BANDS: Array<{ max: number; key: SoreThroatOutcomeKey; tone: ToneKey }> = [
  { max: 0, key: "very-low", tone: "good" },
  { max: 1, key: "low", tone: "good" },
  { max: 2, key: "moderate", tone: "warn" },
  { max: 3, key: "raised", tone: "warn" },
  { max: Infinity, key: "high", tone: "alert" },
];

/** `max` is INCLUSIVE here — the score is an integer ladder, not a range. */
export function soreThroatBand(score: number): { key: SoreThroatOutcomeKey; tone: ToneKey } {
  const band =
    SORE_THROAT_BANDS.find((entry) => score <= entry.max) ??
    SORE_THROAT_BANDS[SORE_THROAT_BANDS.length - 1];
  return { key: band.key, tone: band.tone };
}

export function soreThroatScore(input: SoreThroatInput): SoreThroatResult {
  const redFlags: SoreThroatRedFlagKey[] = [];
  if (input.airway) redFlags.push("airway");
  if (input.rash) redFlags.push("rash");
  if (input.immunosuppressed) redFlags.push("immunosuppressed");

  const criteria = [input.fever, input.noCough, input.tenderNodes, input.tonsillarExudate];
  const criteriaMet = criteria.filter(Boolean).length;
  const agePoints = mcIsaacAgePoints(input.age);
  const score = criteriaMet + agePoints;

  const base = { score, agePoints, criteriaMet, redFlags };

  // Precedence: airway beats everything, then the other flags, then the age
  // floor. Only when none of those fire does the number get to speak.
  if (input.airway) {
    return { ...base, outcome: "emergency", tone: "alert", scoreSuppressed: true };
  }
  if (input.rash || input.immunosuppressed) {
    return { ...base, outcome: "see-today", tone: "alert", scoreSuppressed: true };
  }
  if (Number.isFinite(input.age) && input.age < SORE_THROAT_MIN_AGE) {
    return { ...base, outcome: "too-young", tone: "warn", scoreSuppressed: true };
  }

  const band = soreThroatBand(score);
  return { ...base, outcome: band.key, tone: band.tone, scoreSuppressed: false };
}

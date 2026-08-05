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

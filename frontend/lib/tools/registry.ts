/**
 * Free health tools — structure only. Every user-facing string lives in
 * `locales/<lang>/tools.json`, so the pages ship in all six site languages and in
 * every market.
 *
 * Why they exist: the topic-gap research (2026-08-05) showed our closest Irish
 * competitor draws ~55% of its measured organic traffic from ONE free BMI
 * calculator page rather than from its service pages, and the same query has
 * far bigger demand in our other markets than in Ireland —
 * `calculadora imc` is 246,000/mo in Brazil (KD 16) and 49,500/mo in Spain
 * (KD 11), `bmi kalkulačka` 40,500/mo in Czechia (KD 5), against 2,900/mo for
 * `bmi calculator ireland`. Hence: every country, every locale.
 *
 * SHIPPING ONE TOOL AT A TIME. BMI and the due-date calculator are live; the
 * calorie, blood-pressure and ADHD tools followed; ovulation is planned next
 * and its maths already sits (tested) in `calc.ts`. Adding one means: a `ToolMeta`
 * entry here, a widget branch in `ToolWidget.tsx`, and its copy block in the
 * six `tools.json` files. Nothing else — the renderer is generic.
 *
 * Due date is the biggest of the set by demand: `calculadora gestacional` is
 * 135,000/mo in Brazil at KD 0, `těhotenská kalkulačka` 8,100 in Czechia,
 * `calculator sarcina` 8,100 in Romania.
 *
 * This file must stay in lock-step with `tools.json`: the `sections` entries
 * here are positional, matching each tool's `sections` array in the JSON, and
 * `rowTones` matches that section's table rows. `registry.test.ts` enforces
 * the parity so a copy edit cannot silently desync the tones.
 */

import enTools from "@/locales/en/tools.json";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export type WidgetKey =
  | "bmi"
  | "calorie"
  | "blood-pressure"
  | "due-date"
  | "adhd"
  | "ovulation";

/** Row tone drives the colour dot in the rendered chart tables. */
export type ToneKey = "good" | "warn" | "alert" | "muted";

/** Positional metadata for one section of a tool page. */
type SectionMeta = {
  /** Anchor id — stable across locales, so deep links survive translation. */
  id: string;
  theme: "ivory" | "forest";
  /** One tone per table row, in the JSON's row order. Omit if no table. */
  rowTones?: ToneKey[];
};

export type ToolMeta = {
  slug: string;
  widget: WidgetKey;
  sections: SectionMeta[];
  /**
   * Other tool slugs to cross-link in the related strip. EMPTY MEANS EVERY
   * OTHER TOOL — with a handful of calculators that is what you want, and it
   * means adding a tool cross-links it from the existing pages automatically.
   * Fill it in only to narrow the list.
   */
  related: string[];
  /** Country-relative CTA path; the renderer prefixes `/{country}/{lang}`. */
  ctaPath: string;
};

export const TOOLS: ToolMeta[] = [
  {
    slug: "bmi-calculator",
    widget: "bmi",
    sections: [
      // Bands alternate from the dark hero. The chart itself renders as forest
      // glass regardless of the band it sits on (see `ToolTableBlock`), so the
      // dark instrument lands on the ivory pattern rather than on forest.
      {
        id: "categories",
        theme: "ivory",
        rowTones: ["warn", "good", "warn", "alert", "alert", "alert"],
      },
      { id: "formula", theme: "forest" },
      { id: "limits", theme: "ivory" },
      { id: "next", theme: "forest" },
    ],
    related: [],
    ctaPath: "/gp-consultation-online",
  },
  {
    slug: "calorie-calculator",
    widget: "calorie",
    sections: [
      // Same alternation as BMI: first band ivory off the dark hero. The
      // targets table is the one chart, and it renders forest-glass on the
      // ivory band like every other tool table.
      {
        id: "targets",
        theme: "ivory",
        rowTones: ["good", "good", "warn", "muted"],
      },
      { id: "activity", theme: "forest" },
      { id: "formula", theme: "ivory" },
      { id: "limits", theme: "forest" },
    ],
    related: [],
    ctaPath: "/gp-consultation-online",
  },
  {
    slug: "blood-pressure-chart",
    widget: "blood-pressure",
    sections: [
      // Row order and tones follow `bpCategory` in `calc.ts`: the eight ESC/ESH
      // adult categories, isolated systolic last because the guideline lists it
      // as a pattern rather than a step on the ladder.
      {
        id: "chart",
        theme: "ivory",
        rowTones: ["muted", "good", "good", "warn", "warn", "alert", "alert", "warn"],
      },
      { id: "measuring", theme: "forest" },
      { id: "limits", theme: "ivory" },
      { id: "urgent", theme: "forest" },
    ],
    related: [],
    ctaPath: "/gp-consultation-online",
  },
  {
    slug: "due-date-calculator",
    widget: "due-date",
    sections: [
      // The 40-week breakdown is the chart. Row tones are the term ladder, not
      // a risk scale: the three trimester rows are neutral, full term is the
      // good one, early and late term are the "watch this" rows and post-term
      // is the one that gets acted on.
      {
        id: "timeline",
        theme: "ivory",
        rowTones: ["muted", "muted", "muted", "warn", "good", "warn", "alert"],
      },
      { id: "dating", theme: "forest" },
      { id: "scan", theme: "ivory" },
      { id: "next", theme: "forest" },
    ],
    related: [],
    ctaPath: "/gp-consultation-online",
  },
  {
    slug: "adhd-test",
    widget: "adhd",
    sections: [
      // The chart is the six ASRS Part A items with the answer each one counts
      // from. Row tones are the THRESHOLD TIER, not a severity scale: the first
      // three items count from "Sometimes", the last three only from "Often",
      // and that difference is the whole reason the scale is not a flat
      // cut-off. Nothing here says one symptom is worse than another.
      {
        id: "scoring",
        theme: "ivory",
        rowTones: ["warn", "warn", "warn", "alert", "alert", "alert"],
      },
      { id: "symptoms", theme: "forest" },
      { id: "limits", theme: "ivory" },
      { id: "assessment", theme: "forest" },
    ],
    related: [],
    ctaPath: "/gp-consultation-online",
  },
  {
    slug: "ovulation-calculator",
    widget: "ovulation",
    sections: [
      // The chart is one 28-day cycle, day by day. Row tones are FERTILITY, not
      // risk: the two fertile rows are the good ones, the day after ovulation is
      // the warn row because the window has effectively shut, and the rest of
      // the cycle is neutral.
      {
        id: "window",
        theme: "ivory",
        rowTones: ["muted", "muted", "good", "good", "warn", "muted"],
      },
      { id: "signs", theme: "forest" },
      { id: "limits", theme: "ivory" },
      { id: "next", theme: "forest" },
    ],
    related: [],
    ctaPath: "/gp-consultation-online",
  },
];

const BY_SLUG = new Map(TOOLS.map((tool) => [tool.slug, tool]));

export function getToolMeta(slug: string): ToolMeta | undefined {
  return BY_SLUG.get(slug);
}

export const TOOL_SLUGS = TOOLS.map((tool) => tool.slug);

/* ------------------------------------------------------------------ copy */

export type ToolTableCopy = {
  caption: string;
  columns: string[];
  rows: string[][];
  footnote: string;
};

export type ToolSectionCopy = {
  heading: string;
  body: string[];
  bullets: string[];
  table?: ToolTableCopy;
};

/**
 * Hand-written rather than derived from the JSON: each tool's `widget` block
 * has its own keys, so a type taken from one tool would reject the next one.
 * The widget strings are therefore a string map.
 */
export type ToolCopy = {
  cardTitle: string;
  cardBlurb: string;
  eyebrow: string;
  h1Lead: string;
  h1Accent: string;
  h1Trail: string;
  metaTitle: string;
  metaDescription: string;
  lede: string;
  trustPoints: string[];
  /**
   * Overrides the shared `suggestions.intro` on this tool's page. The shared
   * line names BMI, which would be wrong copy on any other tool.
   */
  suggestionsIntro?: string;
  widget: Record<string, string>;
  sections: ToolSectionCopy[];
  faq: Array<{ question: string; answer: string }>;
  cta: { heading: string; body: string; label: string };
};

export type ToolsUiCopy = typeof enTools.ui;
export type ToolsBandsCopy = typeof enTools.bands;
export type ToolsSuggestionsCopy = typeof enTools.suggestions;
/** Copy for the `/tools` index and the related strip on each tool page. */
export type ToolsHubCopy = typeof enTools.hub;

export type ToolsBundle = {
  ui: ToolsUiCopy;
  bands: ToolsBandsCopy;
  suggestions: ToolsSuggestionsCopy;
  hub: ToolsHubCopy;
  tools: Record<string, ToolCopy>;
};

export function getToolsCopy(locale: LocaleCode): ToolsBundle {
  return loadLocaleBundle(locale).tools as unknown as ToolsBundle;
}

/** Copy for one tool, or undefined when the slug is not a tool. */
export function getToolCopy(locale: LocaleCode, slug: string): ToolCopy | undefined {
  return getToolsCopy(locale).tools[slug];
}

export { fillPlaceholders } from "@/lib/tools/placeholders";

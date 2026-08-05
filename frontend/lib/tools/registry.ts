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
 * SHIPPING ONE TOOL AT A TIME. BMI is live; the calorie, blood-pressure,
 * due-date, ovulation and ADHD tools are planned next and their maths already
 * sits (tested) in `calc.ts`. Adding one means: a `ToolMeta` entry here, a
 * widget branch in `ToolWidget.tsx`, and its copy block in the six
 * `tools.json` files. Nothing else — the renderer is generic. Once a second
 * tool lands, restore the `/tools` hub route and the related-tools strip.
 *
 * This file must stay in lock-step with `tools.json`: the `sections` entries
 * here are positional, matching each tool's `sections` array in the JSON, and
 * `rowTones` matches that section's table rows. `registry.test.ts` enforces
 * the parity so a copy edit cannot silently desync the tones.
 */

import enTools from "@/locales/en/tools.json";
import type { LocaleCode } from "@/lib/i18n/types";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export type WidgetKey = "bmi";

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
  /** Other tool slugs to cross-link. Empty until a second tool ships. */
  related: string[];
  /** Country-relative CTA path; the renderer prefixes `/{country}/{lang}`. */
  ctaPath: string;
};

export const TOOLS: ToolMeta[] = [
  {
    slug: "bmi-calculator",
    widget: "bmi",
    sections: [
      {
        id: "categories",
        theme: "ivory",
        rowTones: ["warn", "good", "warn", "alert", "alert", "alert"],
      },
      { id: "formula", theme: "forest" },
      { id: "limits", theme: "ivory" },
      { id: "next", theme: "ivory" },
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
  widget: Record<string, string>;
  sections: ToolSectionCopy[];
  faq: Array<{ question: string; answer: string }>;
  cta: { heading: string; body: string; label: string };
};

export type ToolsUiCopy = typeof enTools.ui;
export type ToolsBandsCopy = typeof enTools.bands;
export type ToolsSuggestionsCopy = typeof enTools.suggestions;

export type ToolsBundle = {
  ui: ToolsUiCopy;
  bands: ToolsBandsCopy;
  suggestions: ToolsSuggestionsCopy;
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

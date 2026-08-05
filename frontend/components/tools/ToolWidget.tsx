"use client";

/**
 * The interactive health-tool widgets. BMI is the only one live today — the
 * rest of the planned set (calories, blood pressure, due date, ovulation,
 * ADHD) ships one at a time; their maths already sits, tested, in `calc.ts`.
 *
 * Two rules hold this file together:
 *
 * 1. NO ENGLISH. Every string arrives as `copy`, resolved server-side from
 *    `locales/<lang>/tools.json`, because these pages ship in six languages across
 *    six markets.
 * 2. NO CONTENT. Only the inputs and the read-out live inside this client
 *    boundary. The headings, chart tables and FAQ are server-rendered by
 *    `tool-page.tsx` — copy trapped inside a client island is the recurring
 *    cause of our missing-content SEO defects.
 *
 * The calculators start on sensible defaults rather than empty, so the page
 * lands with a working, populated instrument instead of a blank form. The
 * defaults are constants, so the server and client render identically.
 */

import { useId, useMemo, useState } from "react";
import type { BmiBandKey } from "@/lib/tools/calc";
import {
  BMI_GAUGE_MAX,
  BMI_GAUGE_MIN,
  CM_PER_FOOT,
  CM_PER_INCH,
  KG_PER_POUND,
  KG_PER_STONE,
  bmi,
  bmiBand,
  healthyWeightRange,
  weightToHealthyRange,
} from "@/lib/tools/calc";
import { fillPlaceholders } from "@/lib/tools/placeholders";
// Type-only: `registry.ts` pulls in the locale loader, which would drag all
// six locale bundles into this client chunk if imported for a value.
import type { ToolsBandsCopy, ToolsUiCopy, WidgetKey } from "@/lib/tools/registry";
import {
  TOOL_INPUT_CLASS,
  TOOL_INPUT_STYLE,
  ToolCard,
  ToolField,
  ToolGauge,
  ToolNote,
  ToolResult,
  ToolSegmented,
  ToolSlider,
  ToolStatRow,
} from "@/components/tools/ToolShell";

/**
 * Per-band service nudge, resolved server-side from this market's live
 * catalogue (see `service-suggestions.ts`). Null for a band whose market has
 * nothing relevant to offer — the widget then renders no nudge rather than a
 * dead link.
 */
export type BandNudges = Record<BmiBandKey, { text: string; label: string; href: string } | null>;

/**
 * Only what the inputs and the read-out actually render.
 *
 * Deliberately NOT the whole `ToolCopy`: passing that serialised every
 * section and every FAQ answer into the RSC payload as well as into the HTML,
 * doubling the page's copy weight for strings this component never reads.
 */
export type WidgetCopy = {
  ui: ToolsUiCopy;
  bands: ToolsBandsCopy;
  /** The tool's own `widget` block — labels, placeholder, note. */
  widget: Record<string, string>;
  /** BCP-47 tag for number formatting, e.g. "pt-BR". */
  formatLocale: string;
};

const num = (value: string): number => {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

/** Locale-correct digits — "25,5" in pt/es/cs/ro/de, "25.5" in en. */
const useFormatters = (formatLocale: string) =>
  useMemo(
    () => ({
      number: new Intl.NumberFormat(formatLocale, { maximumFractionDigits: 0 }),
      decimal: new Intl.NumberFormat(formatLocale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    }),
    [formatLocale],
  );

export function ToolWidget({
  kind,
  copy,
  nudges,
}: {
  kind: WidgetKey;
  copy: WidgetCopy;
  nudges: BandNudges;
}) {
  switch (kind) {
    case "bmi":
      return <BmiWidget copy={copy} nudges={nudges} />;
  }
}

/* ------------------------------------------------------------------- BMI */

const BMI_SEGMENTS = [
  { from: 15, to: 18.5, tone: "warn" as const },
  { from: 18.5, to: 25, tone: "good" as const },
  { from: 25, to: 30, tone: "warn" as const },
  { from: 30, to: 35, tone: "alert" as const },
  { from: 35, to: 40, tone: "alert" as const },
];
const BMI_TICKS = [15, 18.5, 25, 30, 35, 40];

function BmiWidget({ copy, nudges }: { copy: WidgetCopy; nudges: BandNudges }) {
  const id = useId();
  const { ui, bands } = copy;
  const { decimal, number } = useFormatters(copy.formatLocale);
  const w = copy.widget;

  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  // Canonical values as strings so a half-typed entry ("17") is not clobbered.
  const [cm, setCm] = useState("170");
  const [kg, setKg] = useState("70");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("7");
  const [stone, setStone] = useState("11");
  const [pounds, setPounds] = useState("0");

  const heightCm =
    units === "metric"
      ? num(cm)
      : (num(feet) || 0) * CM_PER_FOOT + (num(inches) || 0) * CM_PER_INCH;
  const weightKg =
    units === "metric"
      ? num(kg)
      : (num(stone) || 0) * KG_PER_STONE + (num(pounds) || 0) * KG_PER_POUND;

  /** Carry the current body over when switching units, rather than resetting. */
  const switchUnits = (next: "metric" | "imperial") => {
    if (next === units) return;
    if (next === "imperial" && Number.isFinite(heightCm) && Number.isFinite(weightKg)) {
      const totalInches = heightCm / CM_PER_INCH;
      setFeet(String(Math.floor(totalInches / 12)));
      setInches(String(Math.round(totalInches % 12)));
      const totalStone = weightKg / KG_PER_STONE;
      setStone(String(Math.floor(totalStone)));
      setPounds(String(Math.round((totalStone % 1) * 14)));
    }
    if (next === "metric" && Number.isFinite(heightCm) && Number.isFinite(weightKg)) {
      setCm(String(Math.round(heightCm)));
      setKg(String(Math.round(weightKg)));
    }
    setUnits(next);
  };

  const value = bmi(weightKg, heightCm);
  const band = value === null ? null : bmiBand(value);
  const bandCopy = band ? bands.bmi[band.key] : null;
  const healthy = value === null ? null : healthyWeightRange(heightCm);
  const gap = value === null ? null : weightToHealthyRange(weightKg, heightCm);

  const nudge = band ? nudges[band.key] : null;

  const gapText =
    gap === null
      ? null
      : gap === 0
        ? w.gapInside
        : fillPlaceholders(gap > 0 ? w.gapAbove : w.gapBelow, {
            kg: decimal.format(Math.abs(gap)),
          });

  return (
    <ToolCard title={w.title}>
      <ToolSegmented
        legend={ui.units}
        name={`${id}-units`}
        value={units}
        onChange={switchUnits}
        options={[
          { value: "metric", label: ui.metric },
          { value: "imperial", label: ui.imperial },
        ]}
      />

      {units === "metric" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <ToolField label={ui.height} htmlFor={`${id}-cm`} suffix={ui.cm}>
            <input
              id={`${id}-cm`}
              className={TOOL_INPUT_CLASS}
              style={TOOL_INPUT_STYLE}
              inputMode="decimal"
              value={cm}
              onChange={(event) => setCm(event.target.value)}
            />
            <ToolSlider
              id={`${id}-cm-range`}
              ariaLabel={ui.height}
              min={120}
              max={220}
              value={num(cm)}
              onChange={(next) => setCm(String(next))}
            />
          </ToolField>
          <ToolField label={ui.weight} htmlFor={`${id}-kg`} suffix={ui.kg}>
            <input
              id={`${id}-kg`}
              className={TOOL_INPUT_CLASS}
              style={TOOL_INPUT_STYLE}
              inputMode="decimal"
              value={kg}
              onChange={(event) => setKg(event.target.value)}
            />
            <ToolSlider
              id={`${id}-kg-range`}
              ariaLabel={ui.weight}
              min={35}
              max={200}
              value={num(kg)}
              onChange={(next) => setKg(String(next))}
            />
          </ToolField>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <ToolField label={ui.feetLabel} htmlFor={`${id}-ft`}>
              <input
                id={`${id}-ft`}
                className={TOOL_INPUT_CLASS}
                style={TOOL_INPUT_STYLE}
                inputMode="numeric"
                value={feet}
                onChange={(event) => setFeet(event.target.value)}
              />
            </ToolField>
            <ToolField label={ui.inchesLabel} htmlFor={`${id}-in`}>
              <input
                id={`${id}-in`}
                className={TOOL_INPUT_CLASS}
                style={TOOL_INPUT_STYLE}
                inputMode="numeric"
                value={inches}
                onChange={(event) => setInches(event.target.value)}
              />
            </ToolField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ToolField label={ui.stoneLabel} htmlFor={`${id}-st`}>
              <input
                id={`${id}-st`}
                className={TOOL_INPUT_CLASS}
                style={TOOL_INPUT_STYLE}
                inputMode="numeric"
                value={stone}
                onChange={(event) => setStone(event.target.value)}
              />
            </ToolField>
            <ToolField label={ui.poundsLabel} htmlFor={`${id}-lb`} hint={ui.poundsOnlyHint}>
              <input
                id={`${id}-lb`}
                className={TOOL_INPUT_CLASS}
                style={TOOL_INPUT_STYLE}
                inputMode="numeric"
                value={pounds}
                onChange={(event) => setPounds(event.target.value)}
              />
            </ToolField>
          </div>
        </div>
      )}

      <ToolResult
        placeholder={w.placeholder}
        value={value === null ? null : decimal.format(value)}
        label={bandCopy?.label}
        summary={bandCopy?.summary}
        tone={band?.tone}
      >
        <ToolGauge
          label={w.scaleLabel}
          min={BMI_GAUGE_MIN}
          max={BMI_GAUGE_MAX}
          value={value}
          segments={BMI_SEGMENTS}
          ticks={BMI_TICKS}
        />
        {healthy && gapText ? (
          <ToolStatRow
            items={[
              {
                label: w.healthyRangeLabel,
                value: `${number.format(healthy.min)} – ${number.format(healthy.max)} ${ui.kg}`,
              },
              { label: w.gapLabel, value: gapText },
            ]}
          />
        ) : null}

        {nudge ? (
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-text-body)" }}>
              {nudge.text}
            </p>
            <a
              href={nudge.href}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-colors"
              style={{ background: "var(--color-brand-accent)", color: "#0F2E25" }}
            >
              {nudge.label}
              <span aria-hidden>→</span>
            </a>
          </div>
        ) : null}
      </ToolResult>

      <ToolNote>{w.note}</ToolNote>
    </ToolCard>
  );
}

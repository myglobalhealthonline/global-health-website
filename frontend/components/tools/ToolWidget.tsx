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

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { TriangleAlert } from "lucide-react";
import type { BmiBandKey } from "@/lib/tools/calc";
import type { ActivityKey, Sex } from "@/lib/tools/calc";
import {
  ACTIVITY_LEVELS,
  ADHD_QUESTIONS,
  adhdScore,
  BMI_GAUGE_MAX,
  BMI_GAUGE_MIN,
  CM_PER_FOOT,
  CM_PER_INCH,
  KG_PER_POUND,
  KG_PER_STONE,
  addDays,
  bmr,
  calorieTargets,
  tdee,
  bmi,
  bmiBand,
  bpCategory,
  daysBetween,
  dueDateFromLmp,
  healthyWeightRange,
  ovulationFromLmp,
  parseISODate,
  todayUTC,
  weightToHealthyRange,
} from "@/lib/tools/calc";
import { TONE } from "@/lib/tools/tone";
import { fillPlaceholders } from "@/lib/tools/placeholders";
// Type-only: `registry.ts` pulls in the locale loader, which would drag all
// six locale bundles into this client chunk if imported for a value.
import type { ToolsBandsCopy, ToolsUiCopy, WidgetKey } from "@/lib/tools/registry";
import {
  TOOL_INPUT_CLASS,
  UNIT_SUFFIX_CLASS,
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
    case "blood-pressure":
      return <BloodPressureWidget copy={copy} />;
    case "due-date":
      return <DueDateWidget copy={copy} />;
    case "calorie":
      return <CalorieWidget copy={copy} />;
    case "adhd":
      return <AdhdWidget copy={copy} />;
    case "ovulation":
      return <OvulationWidget copy={copy} />;
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
        /* Imperial gets the same treatment as metric: one slider per
         * measurement, driving the ft/in and st/lb pair together. Four bare
         * number boxes read as a form; the sliders make it an instrument. */
        <div className="grid gap-5 sm:grid-cols-2">
          <ToolField label={ui.height} htmlFor={`${id}-ft`} suffix="ft / in">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  id={`${id}-ft`}
                  className={`${TOOL_INPUT_CLASS} pr-8`}
                  style={TOOL_INPUT_STYLE}
                  inputMode="numeric"
                  aria-label={ui.feetLabel}
                  value={feet}
                  onChange={(event) => setFeet(event.target.value)}
                />
                <span className={UNIT_SUFFIX_CLASS}>ft</span>
              </div>
              <div className="relative">
                <input
                  id={`${id}-in`}
                  className={`${TOOL_INPUT_CLASS} pr-8`}
                  style={TOOL_INPUT_STYLE}
                  inputMode="numeric"
                  aria-label={ui.inchesLabel}
                  value={inches}
                  onChange={(event) => setInches(event.target.value)}
                />
                <span className={UNIT_SUFFIX_CLASS}>in</span>
              </div>
            </div>
            <ToolSlider
              id={`${id}-height-range`}
              ariaLabel={ui.height}
              min={48}
              max={84}
              value={(num(feet) || 0) * 12 + (num(inches) || 0)}
              onChange={(total) => {
                setFeet(String(Math.floor(total / 12)));
                setInches(String(total % 12));
              }}
            />
          </ToolField>

          <ToolField label={ui.weight} htmlFor={`${id}-st`} suffix="st / lb">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  id={`${id}-st`}
                  className={`${TOOL_INPUT_CLASS} pr-8`}
                  style={TOOL_INPUT_STYLE}
                  inputMode="numeric"
                  aria-label={ui.stoneLabel}
                  value={stone}
                  onChange={(event) => setStone(event.target.value)}
                />
                <span className={UNIT_SUFFIX_CLASS}>st</span>
              </div>
              <div className="relative">
                <input
                  id={`${id}-lb`}
                  className={`${TOOL_INPUT_CLASS} pr-8`}
                  style={TOOL_INPUT_STYLE}
                  inputMode="numeric"
                  aria-label={ui.poundsLabel}
                  value={pounds}
                  onChange={(event) => setPounds(event.target.value)}
                />
                <span className={UNIT_SUFFIX_CLASS}>lb</span>
              </div>
            </div>
            <ToolSlider
              id={`${id}-weight-range`}
              ariaLabel={ui.weight}
              min={70}
              max={440}
              value={(num(stone) || 0) * 14 + (num(pounds) || 0)}
              onChange={(total) => {
                setStone(String(Math.floor(total / 14)));
                setPounds(String(total % 14));
              }}
            />
          </ToolField>

          {/* Full-width, so neither column is taller than the other and the
              two sliders stay on the same line. */}
          <p
            className="text-[12px] leading-snug sm:col-span-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            {ui.poundsOnlyHint}
          </p>
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
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-bold text-white transition-colors"
              style={{ background: "var(--color-brand-primary)" }}
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

/* -------------------------------------------------------- Blood pressure */

/**
 * The gauge plots the SYSTOLIC number only. A two-axis plot is the honest
 * picture but an unreadable one at this width, and systolic is what the
 * category almost always turns on — the diastolic value still drives the
 * category through `bpCategory`, which takes the higher of the two.
 *
 * Segment bounds are the ESC/ESH systolic thresholds, so the coloured widths
 * are true to the chart on the page below.
 */
const BP_GAUGE_MIN = 80;
const BP_GAUGE_MAX = 200;
const BP_SEGMENTS = [
  { from: 80, to: 90, tone: "muted" as const },
  { from: 90, to: 120, tone: "good" as const },
  { from: 120, to: 130, tone: "good" as const },
  { from: 130, to: 140, tone: "warn" as const },
  { from: 140, to: 160, tone: "warn" as const },
  { from: 160, to: 180, tone: "alert" as const },
  { from: 180, to: 200, tone: "alert" as const },
];
const BP_TICKS = [90, 120, 140, 160, 180];

/** The optimal target quoted in the read-out, formatted through Intl. */
const BP_OPTIMAL_SYSTOLIC = 120;
const BP_OPTIMAL_DIASTOLIC = 80;

function BloodPressureWidget({ copy }: { copy: WidgetCopy }) {
  const id = useId();
  const { ui, bands } = copy;
  const { number } = useFormatters(copy.formatLocale);
  const w = copy.widget;

  // Constant defaults, so the panel server-renders on a real reading and
  // hydrates identically. 120/80 is the textbook one people recognise.
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");

  const sys = num(systolic);
  const dia = num(diastolic);
  // Null when the pair is unusable — most often a diastolic typed at or above
  // the systolic, which is not a reading any monitor produces.
  const category = bpCategory(sys, dia);
  const bandCopy = category ? bands.bp[category.key] : null;

  return (
    <ToolCard title={w.title}>
      <div className="grid gap-5 sm:grid-cols-2">
        <ToolField label={ui.systolic} htmlFor={`${id}-sys`} suffix={ui.mmHg}>
          <input
            id={`${id}-sys`}
            className={TOOL_INPUT_CLASS}
            style={TOOL_INPUT_STYLE}
            inputMode="numeric"
            value={systolic}
            onChange={(event) => setSystolic(event.target.value)}
          />
          <ToolSlider
            id={`${id}-sys-range`}
            ariaLabel={ui.systolic}
            min={80}
            max={220}
            value={sys}
            onChange={(next) => setSystolic(String(next))}
          />
        </ToolField>

        <ToolField label={ui.diastolic} htmlFor={`${id}-dia`} suffix={ui.mmHg}>
          <input
            id={`${id}-dia`}
            className={TOOL_INPUT_CLASS}
            style={TOOL_INPUT_STYLE}
            inputMode="numeric"
            value={diastolic}
            onChange={(event) => setDiastolic(event.target.value)}
          />
          <ToolSlider
            id={`${id}-dia-range`}
            ariaLabel={ui.diastolic}
            min={40}
            max={140}
            value={dia}
            onChange={(next) => setDiastolic(String(next))}
          />
        </ToolField>
      </div>

      <ToolResult
        placeholder={w.placeholder}
        value={category ? `${number.format(sys)}/${number.format(dia)}` : null}
        unit={ui.mmHg}
        label={bandCopy?.label}
        summary={bandCopy?.summary}
        tone={category?.tone}
      >
        {/* Safety-critical: a grade-3 reading gets an unmissable same-day
         *  instruction naming the emergency symptoms, ABOVE the gauge and the
         *  stats. White fill inside an already tinted card so it separates,
         *  and role="alert" so a screen-reader user is told immediately
         *  rather than after the rest of the read-out. */}
        {category?.urgent ? (
          <div
            role="alert"
            className="mt-4 rounded-xl p-4"
            style={{
              background: "#FFFFFF",
              border: `1.5px solid ${TONE.alert.dot}`,
            }}
          >
            <p
              className="flex items-center gap-2 text-[13.5px] font-extrabold"
              style={{ color: TONE.alert.text }}
            >
              <TriangleAlert className="size-4 shrink-0" strokeWidth={2.2} aria-hidden />
              {w.urgentTitle}
            </p>
            <p
              className="mt-2 text-[13px] leading-relaxed"
              style={{ color: "var(--color-text-body)" }}
            >
              {w.urgentBody}
            </p>
            <p
              className="mt-2 text-[13px] font-bold leading-relaxed"
              style={{ color: TONE.alert.text }}
            >
              {w.urgentSymptoms}
            </p>
          </div>
        ) : null}

        <ToolGauge
          label={w.scaleLabel}
          min={BP_GAUGE_MIN}
          max={BP_GAUGE_MAX}
          value={category ? sys : null}
          segments={BP_SEGMENTS}
          ticks={BP_TICKS}
        />

        <ToolStatRow
          items={[
            {
              label: w.optimalLabel,
              value: fillPlaceholders(w.optimalValue, {
                systolic: number.format(BP_OPTIMAL_SYSTOLIC),
                diastolic: number.format(BP_OPTIMAL_DIASTOLIC),
              }),
            },
          ]}
        />
      </ToolResult>

      <ToolNote>{w.note}</ToolNote>
    </ToolCard>
  );
}

/* -------------------------------------------------------------- Due date */

/**
 * Server-render anchor for the last-period field. It has to be a CONSTANT —
 * deriving it from "today" during render would make the server and the client
 * disagree — so the field falls back to it until the client knows the date, at
 * which point the default becomes eight weeks ago, roughly when people start
 * looking for this page.
 *
 * The gestational-age read-out is gated on the same thing: the due date and the
 * trimester dates depend only on the entered period date, but "how far along am
 * I" depends on today, and that must not come from a date the server invented.
 */
const DUE_DATE_LMP_ANCHOR = "2026-01-01";
const DUE_DATE_LOOKBACK_DAYS = 56;
const DUE_DATE_DEFAULT_CYCLE = "28";
/** `dueDateFromLmp` clamps to the same window; the slider states it. */
const DUE_DATE_CYCLE_MIN = 20;
const DUE_DATE_CYCLE_MAX = 45;
/** The term window ends at 42 weeks — five weeks past the 37-week start. */
const TERM_WINDOW_DAYS = 35;

const isoOf = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Today, as the client sees it — null on the server and through hydration, so
 * both renders agree and the date-dependent read-out simply appears afterwards.
 * `useSyncExternalStore` rather than an effect: nothing is being synchronised
 * INTO an external system, and setting state from an effect on mount is the
 * cascading-render pattern the React lint rule exists to catch.
 */
const NO_SUBSCRIPTION = () => () => {};
const clientTodayIso = () => isoOf(todayUTC());
const serverTodayIso = () => null;

/**
 * Locale-correct dates, formatted in UTC. The date maths works in whole UTC
 * days, so formatting a UTC-midnight date without this would print the day
 * before in every negative-offset market — which is Brazil, the biggest
 * audience this tool has.
 */
const useDateFormatters = (formatLocale: string) =>
  useMemo(
    () => ({
      full: new Intl.DateTimeFormat(formatLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }),
      dayMonth: new Intl.DateTimeFormat(formatLocale, {
        day: "2-digit",
        month: "2-digit",
        timeZone: "UTC",
      }),
    }),
    [formatLocale],
  );

function DueDateWidget({ copy }: { copy: WidgetCopy }) {
  const id = useId();
  const w = copy.widget;
  const { number } = useFormatters(copy.formatLocale);
  const { full, dayMonth } = useDateFormatters(copy.formatLocale);

  const todayIso = useSyncExternalStore<string | null>(
    NO_SUBSCRIPTION,
    clientTodayIso,
    serverTodayIso,
  );
  const today = todayIso === null ? null : parseISODate(todayIso);

  // Only what the visitor typed lives in state; the default is derived, so it
  // is never a stale date left over from whenever the page was built.
  const [entered, setEntered] = useState<string | null>(null);
  const [cycle, setCycle] = useState(DUE_DATE_DEFAULT_CYCLE);
  const lmp =
    entered ??
    (today === null ? DUE_DATE_LMP_ANCHOR : isoOf(addDays(today, -DUE_DATE_LOOKBACK_DAYS)));

  const lmpDate = parseISODate(lmp);
  const cycleDays = num(cycle);
  // `today ?? lmpDate` keeps this call pure before hydration; every field read
  // off `dating` that actually depends on today is gated on `today` below.
  const dating = lmpDate
    ? dueDateFromLmp(lmpDate, Number.isFinite(cycleDays) ? cycleDays : 28, today ?? lmpDate)
    : null;
  const outOfRange = today !== null && dating !== null && dating.outOfRange;
  const trimester = today !== null && dating !== null && !outOfRange ? dating.trimester : null;

  // "9w 3d" is deliberately language-neutral: written out, every locale needs
  // its own plural rules for both halves, and none of them fit a stat row.
  const stats =
    dating !== null && today !== null && !outOfRange
      ? [
          { label: w.gestationalAgeLabel, value: `${dating.weeks}w ${dating.days}d` },
          {
            label: w.daysToGoLabel,
            value: number.format(Math.max(0, daysBetween(today, dating.dueDate))),
          },
          { label: w.secondTrimesterLabel, value: full.format(dating.secondTrimesterStart) },
          { label: w.thirdTrimesterLabel, value: full.format(dating.thirdTrimesterStart) },
          {
            label: w.termWindowLabel,
            value: `${dayMonth.format(dating.termStart)} – ${dayMonth.format(
              addDays(dating.termStart, TERM_WINDOW_DAYS),
            )}`,
          },
        ]
      : [];

  return (
    <ToolCard title={w.title}>
      {/* Native date input on purpose: it already speaks the visitor's locale
       *  and gives phones the platform date picker. */}
      <ToolField label={w.lmpLabel} hint={w.lmpHint} htmlFor={`${id}-lmp`}>
        <input
          id={`${id}-lmp`}
          type="date"
          className={TOOL_INPUT_CLASS}
          style={TOOL_INPUT_STYLE}
          value={lmp}
          onChange={(event) => setEntered(event.target.value)}
        />
      </ToolField>

      <ToolField label={w.cycleLabel} hint={w.cycleHint} htmlFor={`${id}-cycle`} suffix={w.daysUnit}>
        <input
          id={`${id}-cycle`}
          className={TOOL_INPUT_CLASS}
          style={TOOL_INPUT_STYLE}
          inputMode="numeric"
          value={cycle}
          onChange={(event) => setCycle(event.target.value)}
        />
        <ToolSlider
          id={`${id}-cycle-range`}
          ariaLabel={w.cycleLabel}
          min={DUE_DATE_CYCLE_MIN}
          max={DUE_DATE_CYCLE_MAX}
          value={cycleDays}
          onChange={(next) => setCycle(String(next))}
        />
      </ToolField>

      <ToolResult
        placeholder={outOfRange ? w.outOfRangeNote : w.placeholder}
        value={dating !== null && !outOfRange ? full.format(dating.dueDate) : null}
        label={trimester ? w[`trimester${trimester}`] : undefined}
        summary={trimester ? w[`trimester${trimester}Note`] : undefined}
        tone="good"
      >
        {stats.length > 0 ? <ToolStatRow items={stats} /> : null}
      </ToolResult>

      <ToolNote>{w.note}</ToolNote>
    </ToolCard>
  );
}

/* -------------------------------------------------------------- Calories */

function CalorieWidget({ copy }: { copy: WidgetCopy }) {
  const id = useId();
  const { ui, bands } = copy;
  const { number } = useFormatters(copy.formatLocale);
  const w = copy.widget;

  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [sex, setSex] = useState<Sex>("male");
  // Constant defaults, so the server and the first client render agree.
  const [age, setAge] = useState("30");
  const [cm, setCm] = useState("170");
  const [kg, setKg] = useState("70");
  const [feet, setFeet] = useState("5");
  const [inches, setInches] = useState("7");
  const [stone, setStone] = useState("11");
  const [pounds, setPounds] = useState("0");
  const [activity, setActivity] = useState<ActivityKey>("light");

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

  const basal = bmr({ sex, weightKg, heightCm, age: num(age) });
  const maintenance = basal === null ? null : tdee(basal, activity);
  const targets = maintenance === null ? null : calorieTargets(maintenance);
  const level = bands.activity[activity];

  return (
    <ToolCard title={w.title}>
      <ToolSegmented
        legend={ui.sex}
        name={`${id}-sex`}
        value={sex}
        onChange={setSex}
        options={[
          { value: "male", label: ui.male },
          { value: "female", label: ui.female },
        ]}
      />

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

      <ToolField label={ui.age} htmlFor={`${id}-age`} suffix={ui.years}>
        <input
          id={`${id}-age`}
          className={TOOL_INPUT_CLASS}
          style={TOOL_INPUT_STYLE}
          inputMode="numeric"
          value={age}
          onChange={(event) => setAge(event.target.value)}
        />
        <ToolSlider
          id={`${id}-age-range`}
          ariaLabel={ui.age}
          min={18}
          max={100}
          value={num(age)}
          onChange={(next) => setAge(String(next))}
        />
      </ToolField>

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
        /* ponytail: this metric/imperial pair mirrors the BMI widget's rather
           than sharing it — the two were written in parallel sessions. Fold
           them into one `BodyFields` component once both have settled. */
        <div className="grid gap-5 sm:grid-cols-2">
          <ToolField label={ui.height} htmlFor={`${id}-ft`} suffix="ft / in">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  id={`${id}-ft`}
                  className={`${TOOL_INPUT_CLASS} pr-8`}
                  style={TOOL_INPUT_STYLE}
                  inputMode="numeric"
                  aria-label={ui.feetLabel}
                  value={feet}
                  onChange={(event) => setFeet(event.target.value)}
                />
                <span className={UNIT_SUFFIX_CLASS}>ft</span>
              </div>
              <div className="relative">
                <input
                  id={`${id}-in`}
                  className={`${TOOL_INPUT_CLASS} pr-8`}
                  style={TOOL_INPUT_STYLE}
                  inputMode="numeric"
                  aria-label={ui.inchesLabel}
                  value={inches}
                  onChange={(event) => setInches(event.target.value)}
                />
                <span className={UNIT_SUFFIX_CLASS}>in</span>
              </div>
            </div>
            <ToolSlider
              id={`${id}-height-range`}
              ariaLabel={ui.height}
              min={48}
              max={84}
              value={(num(feet) || 0) * 12 + (num(inches) || 0)}
              onChange={(total) => {
                setFeet(String(Math.floor(total / 12)));
                setInches(String(total % 12));
              }}
            />
          </ToolField>

          <ToolField label={ui.weight} htmlFor={`${id}-st`} suffix="st / lb">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  id={`${id}-st`}
                  className={`${TOOL_INPUT_CLASS} pr-8`}
                  style={TOOL_INPUT_STYLE}
                  inputMode="numeric"
                  aria-label={ui.stoneLabel}
                  value={stone}
                  onChange={(event) => setStone(event.target.value)}
                />
                <span className={UNIT_SUFFIX_CLASS}>st</span>
              </div>
              <div className="relative">
                <input
                  id={`${id}-lb`}
                  className={`${TOOL_INPUT_CLASS} pr-8`}
                  style={TOOL_INPUT_STYLE}
                  inputMode="numeric"
                  aria-label={ui.poundsLabel}
                  value={pounds}
                  onChange={(event) => setPounds(event.target.value)}
                />
                <span className={UNIT_SUFFIX_CLASS}>lb</span>
              </div>
            </div>
            <ToolSlider
              id={`${id}-weight-range`}
              ariaLabel={ui.weight}
              min={70}
              max={440}
              value={(num(stone) || 0) * 14 + (num(pounds) || 0)}
              onChange={(total) => {
                setStone(String(Math.floor(total / 14)));
                setPounds(String(total % 14));
              }}
            />
          </ToolField>
        </div>
      )}

      {/* A select rather than a segmented control: the level labels are full
          phrases ("Moderately active") in every language and would not survive
          five columns. */}
      <ToolField label={ui.activity} htmlFor={`${id}-activity`} hint={level.summary}>
        <select
          id={`${id}-activity`}
          className={TOOL_INPUT_CLASS}
          style={TOOL_INPUT_STYLE}
          value={activity}
          onChange={(event) => setActivity(event.target.value as ActivityKey)}
        >
          {ACTIVITY_LEVELS.map((option) => (
            <option key={option.key} value={option.key}>
              {bands.activity[option.key].label}
            </option>
          ))}
        </select>
      </ToolField>

      <ToolResult
        placeholder={w.placeholder}
        value={maintenance === null ? null : number.format(maintenance)}
        unit={ui.kcalPerDay}
        label={w.resultLabel}
        summary={w.resultSummary}
        tone="good"
      >
        {basal !== null && targets ? (
          <ToolStatRow
            items={[
              { label: w.bmrLabel, value: number.format(basal) },
              { label: w.mildLossLabel, value: number.format(targets.mildLoss) },
              { label: w.lossLabel, value: number.format(targets.loss) },
              { label: w.gainLabel, value: number.format(targets.gain) },
            ]}
          />
        ) : null}
      </ToolResult>

      {/* Hitting the 1,200 kcal floor changes what the small print has to say:
          at that point the tool is no longer describing a self-managed deficit. */}
      <ToolNote>{targets?.floored ? w.noteFloored : w.note}</ToolNote>
    </ToolCard>
  );
}

/* ------------------------------------------------------------------ ADHD */

/** Every item starts at "Never" — a constant, and a real (negative) result. */
const ADHD_DEFAULT_ANSWERS = ADHD_QUESTIONS.map(() => 0);
/** Positives needed for a positive screen; `adhdScore` owns the rule. */
const ADHD_POSITIVE_THRESHOLD = 4;

/**
 * The six ASRS v1.1 Part A items. A select per question rather than a
 * segmented control or a slider: the frequency labels are full words in every
 * language, five of them would not survive one row, and a Likert answer is a
 * named choice rather than a quantity to drag.
 *
 * A screen is not a diagnosis, and the read-out says so on both outcomes — see
 * `bands.adhd` in `tools.json`. The result routes to a consultation and never
 * to medication.
 */
function AdhdWidget({ copy }: { copy: WidgetCopy }) {
  const id = useId();
  const { bands } = copy;
  const { number } = useFormatters(copy.formatLocale);
  const w = copy.widget;

  const [answers, setAnswers] = useState<number[]>(ADHD_DEFAULT_ANSWERS);

  const result = adhdScore(answers);
  const bandCopy = bands.adhd[result.screenPositive ? "positive" : "negative"];

  return (
    <ToolCard title={w.title}>
      <ToolNote>{w.instructions}</ToolNote>

      {ADHD_QUESTIONS.map((question, index) => (
        <ToolField
          key={question.id}
          label={bands.adhdQuestions[index]}
          htmlFor={`${id}-${question.id}`}
        >
          <select
            id={`${id}-${question.id}`}
            className={TOOL_INPUT_CLASS}
            style={TOOL_INPUT_STYLE}
            value={answers[index]}
            onChange={(event) => {
              const next = Number(event.target.value);
              setAnswers((current) =>
                current.map((value, position) => (position === index ? next : value)),
              );
            }}
          >
            {bands.adhdFrequencies.map((label, frequency) => (
              <option key={label} value={frequency}>
                {label}
              </option>
            ))}
          </select>
        </ToolField>
      ))}

      <ToolResult
        placeholder={w.placeholder}
        value={`${number.format(result.positives)} / ${number.format(ADHD_QUESTIONS.length)}`}
        label={bandCopy.label}
        summary={bandCopy.summary}
        tone={result.screenPositive ? "warn" : "muted"}
      >
        <ToolStatRow
          items={[
            {
              label: w.thresholdLabel,
              value: fillPlaceholders(w.thresholdValue, {
                count: number.format(ADHD_POSITIVE_THRESHOLD),
                total: number.format(ADHD_QUESTIONS.length),
              }),
            },
          ]}
        />
      </ToolResult>

      <ToolNote>{w.note}</ToolNote>
    </ToolCard>
  );
}

/* ------------------------------------------------------------- Ovulation */

/**
 * Same hydration contract as the due-date widget: a CONSTANT anchor date, so
 * the server and the first client render agree, replaced by "a week ago" —
 * mid-cycle for most people, and so a window that is still ahead — once the
 * client knows what today is.
 */
const OVULATION_LMP_ANCHOR = "2026-01-01";
const OVULATION_LOOKBACK_DAYS = 7;
const OVULATION_DEFAULT_CYCLE = "28";
/** `ovulationFromLmp` clamps to the same window; the slider states it. */
const OVULATION_CYCLE_MIN = 20;
const OVULATION_CYCLE_MAX = 45;

function OvulationWidget({ copy }: { copy: WidgetCopy }) {
  const id = useId();
  const w = copy.widget;
  const { number } = useFormatters(copy.formatLocale);
  const { full, dayMonth } = useDateFormatters(copy.formatLocale);

  const todayIso = useSyncExternalStore<string | null>(
    NO_SUBSCRIPTION,
    clientTodayIso,
    serverTodayIso,
  );
  const today = todayIso === null ? null : parseISODate(todayIso);

  const [entered, setEntered] = useState<string | null>(null);
  const [cycle, setCycle] = useState(OVULATION_DEFAULT_CYCLE);
  const lmp =
    entered ??
    (today === null ? OVULATION_LMP_ANCHOR : isoOf(addDays(today, -OVULATION_LOOKBACK_DAYS)));

  const lmpDate = parseISODate(lmp);
  const cycleDays = num(cycle);
  // Anchored to the NEXT period rather than counted forward from the LMP: the
  // luteal phase is roughly fixed at 14 days, so a 35-day cycle ovulates around
  // day 21, not day 14. See `ovulationFromLmp`.
  const result = lmpDate
    ? ovulationFromLmp(lmpDate, Number.isFinite(cycleDays) ? cycleDays : 28)
    : null;

  // Only shown while ovulation is still ahead. Once it has passed, the window
  // above belongs to the cycle that started on the date entered, and a negative
  // countdown would read as a fault rather than as history.
  const daysToOvulation = result && today ? daysBetween(today, result.ovulation) : null;

  const stats = result
    ? [
        {
          label: w.fertileWindowLabel,
          value: `${dayMonth.format(result.fertileStart)} – ${dayMonth.format(result.fertileEnd)}`,
        },
        ...(daysToOvulation !== null && daysToOvulation >= 0
          ? [{ label: w.daysToOvulationLabel, value: number.format(daysToOvulation) }]
          : []),
        { label: w.nextPeriodLabel, value: full.format(result.nextPeriod) },
        { label: w.testFromLabel, value: full.format(result.testFrom) },
      ]
    : [];

  return (
    <ToolCard title={w.title}>
      {/* Native date input on purpose: it already speaks the visitor's locale
       *  and gives phones the platform date picker. */}
      <ToolField label={w.lmpLabel} hint={w.lmpHint} htmlFor={`${id}-lmp`}>
        <input
          id={`${id}-lmp`}
          type="date"
          className={TOOL_INPUT_CLASS}
          style={TOOL_INPUT_STYLE}
          value={lmp}
          onChange={(event) => setEntered(event.target.value)}
        />
      </ToolField>

      <ToolField label={w.cycleLabel} hint={w.cycleHint} htmlFor={`${id}-cycle`} suffix={w.daysUnit}>
        <input
          id={`${id}-cycle`}
          className={TOOL_INPUT_CLASS}
          style={TOOL_INPUT_STYLE}
          inputMode="numeric"
          value={cycle}
          onChange={(event) => setCycle(event.target.value)}
        />
        <ToolSlider
          id={`${id}-cycle-range`}
          ariaLabel={w.cycleLabel}
          min={OVULATION_CYCLE_MIN}
          max={OVULATION_CYCLE_MAX}
          value={cycleDays}
          onChange={(next) => setCycle(String(next))}
        />
      </ToolField>

      <ToolResult
        placeholder={w.placeholder}
        value={result ? full.format(result.ovulation) : null}
        label={w.resultLabel}
        summary={w.resultSummary}
        tone="good"
      >
        {stats.length > 0 ? <ToolStatRow items={stats} /> : null}
      </ToolResult>

      <ToolNote>{w.note}</ToolNote>
    </ToolCard>
  );
}

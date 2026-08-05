import type { ReactNode } from "react";
import { TONE } from "@/lib/tools/tone";
import type { ToneKey } from "@/lib/tools/registry";

/**
 * Shared chrome for the free health tools: the forest-glass instrument panel
 * that sits on the dark hero, plus the field/segmented/result primitives the
 * widgets are assembled from.
 *
 * The panel is forest glass — same material as the service cards — but the
 * READ-OUT inside it is deliberately white. The result fill and the gauge are
 * a red/amber/green scale, and on forest the green collapsed into the
 * background, killing the one signal the tool exists to give. Keeping the
 * chassis dark and the instrument face light is also just how gauges work.
 *
 * So: `TONE_DARK` for anything on the panel chassis, `TONE` inside the white
 * read-out and in the chart tables on the page's ivory sections.
 *
 * No hooks here — the file carries no "use client" of its own so the server
 * renderer can reuse `ToolNote` without pulling in a client boundary.
 */

export function ToolCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="gh2-glass-forest gh2-dark-content p-6 sm:p-7">
      {/* Eyebrow, lime like every other eyebrow on the page. The panel used
          muted grey here, which is what made the accent colour look arbitrary. */}
      <p
        className="text-[11px] font-bold uppercase tracking-[0.2em]"
        style={{ color: "var(--color-brand-accent)" }}
      >
        {title}
      </p>
      <div className="mt-5 grid gap-5">{children}</div>
    </div>
  );
}

export function ToolField({
  label,
  hint,
  htmlFor,
  suffix,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  /** Unit shown beside the label ("cm", "kg") — keeps it out of the input. */
  suffix?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {label}
        </label>
        {suffix ? (
          <span
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--color-text-muted)" }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <p className="text-[12px] leading-snug" style={{ color: "var(--color-text-muted)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Shared input styling — 16px font size so iOS Safari never zooms on focus. */
export const TOOL_INPUT_CLASS =
  "w-full rounded-xl border px-3.5 py-2.5 text-[16px] font-semibold outline-none transition-colors focus:border-[var(--color-brand-accent)] focus:ring-2 focus:ring-[rgba(176,241,34,0.22)]";

/**
 * Selects need their own class: the native popup is drawn by the OS, and it
 * inherited the control's white text onto a white system list — the options
 * were there but invisible. `color-scheme: dark` makes the platform draw a
 * dark popup instead; the explicit option colours in globals.css are the
 * fallback for engines that ignore it.
 */
export const TOOL_SELECT_CLASS = "gh-tool-select";

/** Inline unit tag inside an input — used where two fields share one label. */
export const UNIT_SUFFIX_CLASS =
  'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--color-text-muted)]';

export const TOOL_INPUT_STYLE = {
  background: "var(--color-background-page)",
  borderColor: "var(--color-border)",
  color: "var(--color-text-primary)",
} as const;

export function ToolSegmented<T extends string>({
  legend,
  options,
  value,
  onChange,
  name,
}: {
  legend: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
  name: string;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-[13px] font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {legend}
      </legend>
      <div
        className="grid gap-1 rounded-xl p-1"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
          background: "var(--color-background-soft)",
        }}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <label
              key={option.value}
              className="cursor-pointer rounded-lg px-2 py-2 text-center text-[13px] font-bold transition-colors"
              style={{
                background: active ? "var(--color-brand-accent)" : "transparent",
                color: active ? "#0F2E25" : "var(--color-text-body)",
              }}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={active}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The result panel. `value` is the headline figure, `label` the category.
 * Wrapped in aria-live so screen readers announce a recalculation without the
 * user having to hunt for it.
 */
export function ToolResult({
  value,
  unit,
  label,
  summary,
  tone = "muted",
  placeholder,
  children,
}: {
  value?: string | null;
  unit?: string;
  label?: string;
  summary?: string;
  tone?: ToneKey;
  placeholder: string;
  children?: ReactNode;
}) {
  const palette = TONE[tone];
  const hasValue = value !== undefined && value !== null && value !== "";

  return (
    <div
      aria-live="polite"
      className="gh2-card-ivory rounded-2xl p-5"
      style={{
        // Tone fill composited OVER white, never over the forest chassis —
        // that is what keeps green reading as green.
        background: hasValue
          ? `linear-gradient(0deg, ${palette.bg}, ${palette.bg}), #FFFFFF`
          : "#FFFFFF",
        borderColor: hasValue ? palette.border : undefined,
      }}
    >
      {hasValue ? (
        <>
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              className="font-extrabold leading-none tracking-[-0.03em]"
              style={{ fontSize: "clamp(2.25rem, 6vw, 3rem)", color: palette.text }}
            >
              {value}
            </span>
            {unit ? (
              <span className="text-[15px] font-bold" style={{ color: palette.text }}>
                {unit}
              </span>
            ) : null}
          </div>
          {label ? (
            <p className="mt-2 flex items-center gap-2 text-[14px] font-bold" style={{ color: palette.text }}>
              <span
                aria-hidden
                className="inline-block size-2.5 shrink-0 rounded-full"
                style={{ background: palette.dot }}
              />
              {label}
            </p>
          ) : null}
          {summary ? (
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--color-text-body)" }}>
              {summary}
            </p>
          ) : null}
          {children}
        </>
      ) : (
        <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {placeholder}
        </p>
      )}
    </div>
  );
}

/**
 * A labelled range slider paired with the number input above it. The slider is
 * what makes these feel like instruments rather than forms — dragging it
 * updates the result live, which is most of the reason people stay on a
 * calculator page at all.
 */
export function ToolSlider({
  id,
  min,
  max,
  step = 1,
  value,
  onChange,
  ariaLabel,
}: {
  id: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (next: number) => void;
  ariaLabel: string;
}) {
  const clamped = Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  const percent = ((clamped - min) / (max - min)) * 100;

  return (
    <input
      id={id}
      type="range"
      className="gh-tool-range"
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      value={clamped}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ ["--gh-tool-range-fill" as string]: `${percent}%` }}
    />
  );
}

/**
 * Horizontal category gauge with a marker at the current value — the BMI
 * scale, drawn. Segment widths are proportional to their real numeric span, so
 * the picture does not lie about how wide "healthy" actually is.
 */
export function ToolGauge({
  min,
  max,
  value,
  segments,
  ticks,
  label,
}: {
  min: number;
  max: number;
  /** Null renders the empty scale — still useful as a legend. */
  value: number | null;
  segments: Array<{ from: number; to: number; tone: ToneKey }>;
  ticks: number[];
  label: string;
}) {
  const span = max - min;
  const pct = (n: number) => ((Math.min(max, Math.max(min, n)) - min) / span) * 100;
  const markerPercent = value === null ? null : pct(value);

  return (
    <div className="mt-5">
      <p
        className="text-[11px] font-bold uppercase tracking-[0.16em]"
        style={{ color: "var(--color-brand-accent)" }}
      >
        {label}
      </p>
      <div className="relative mt-3 pt-6">
        {markerPercent !== null ? (
          <div
            className="absolute top-0 -translate-x-1/2 transition-[left] duration-200 ease-out"
            style={{ left: `${markerPercent}%` }}
          >
            <span
              aria-hidden
              className="block size-0 border-x-[6px] border-t-[7px] border-x-transparent"
              style={{ borderTopColor: "var(--color-text-primary)" }}
            />
          </div>
        ) : null}

        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          {segments.map((segment) => (
            <span
              key={`${segment.from}-${segment.to}`}
              className="block h-full"
              style={{
                width: `${pct(segment.to) - pct(segment.from)}%`,
                background: TONE[segment.tone].dot,
                opacity: 1,
              }}
            />
          ))}
        </div>

        <div className="relative mt-1.5 h-4">
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute -translate-x-1/2 text-[10.5px] font-semibold tabular-nums"
              style={{ left: `${pct(tick)}%`, color: "var(--color-text-muted)" }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Small print under a widget — the "this is not a diagnosis" line. */
export function ToolNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
      {children}
    </p>
  );
}

/** Secondary read-out rows under the headline number. */
export function ToolStatRow({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="mt-4 grid gap-2 border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline justify-between gap-4">
          <dt className="text-[13px]" style={{ color: "var(--color-text-muted)" }}>
            {item.label}
          </dt>
          <dd className="text-[14px] font-bold" style={{ color: "var(--color-text-primary)" }}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

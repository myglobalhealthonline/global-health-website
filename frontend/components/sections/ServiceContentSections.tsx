/**
 * Long-form service page sections — shared by the GP consultation hub
 * and GP sub-service detail pages (e.g. sick-leave certificate).
 *
 * Each section is content-driven (props in, no data fetching) and themed
 * to the site's forest-green / lime design system. Compose them between
 * the dark PageHero and the FinalCTA / MedicalDisclaimer.
 */

import type { ReactNode } from "react";
import { Check } from "lucide-react";

type Theme = "light" | "soft" | "dark";

const SURFACE: Record<Theme, string> = {
  light: "var(--color-background-page)",
  soft: "var(--color-background-soft)",
  dark: "var(--color-background-dark)",
};

function isDark(theme: Theme) {
  return theme === "dark";
}

function sectionStyle(theme: Theme): React.CSSProperties {
  return {
    background: SURFACE[theme],
    padding: "clamp(56px,7vw,104px) 0",
    borderTop: isDark(theme)
      ? "1px solid rgba(255,255,255,0.06)"
      : "1px solid rgba(29,75,54,0.10)",
  };
}

function Eyebrow({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <p
      className="text-[11px] font-bold uppercase tracking-[0.2em]"
      style={{
        color: isDark(theme)
          ? "var(--color-brand-accent)"
          : "var(--color-brand-primary)",
      }}
    >
      {children}
    </p>
  );
}

function SectionTitle({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <h2
      className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.04]"
      style={{
        fontSize: "clamp(1.75rem, 3vw + 0.5rem, 2.75rem)",
        color: isDark(theme) ? "rgba(255,255,255,0.95)" : "var(--color-text-primary)",
        maxWidth: "20ch",
      }}
    >
      {children}
    </h2>
  );
}

// ── Intro lead paragraph ─────────────────────────────────────────────

export function ServiceIntro({
  eyebrow = "Overview",
  body,
  theme = "light",
}: {
  eyebrow?: string;
  body: string;
  theme?: Theme;
}) {
  return (
    <section style={sectionStyle(theme)}>
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <Eyebrow theme={theme}>{eyebrow}</Eyebrow>
        <p
          className="mt-5 leading-relaxed"
          style={{
            fontSize: "clamp(1.15rem, 1vw + 0.9rem, 1.5rem)",
            color: isDark(theme) ? "rgba(255,255,255,0.78)" : "var(--color-text-body)",
            maxWidth: "62ch",
            fontWeight: 500,
          }}
        >
          {body}
        </p>
      </div>
    </section>
  );
}

// ── Checklist (who this is for / what it covers) ─────────────────────

export function ChecklistSection({
  eyebrow,
  title,
  intro,
  items,
  note,
  theme = "soft",
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  items: string[];
  note?: string;
  theme?: Theme;
}) {
  const dark = isDark(theme);
  return (
    <section style={sectionStyle(theme)}>
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <Eyebrow theme={theme}>{eyebrow}</Eyebrow>
        <SectionTitle theme={theme}>{title}</SectionTitle>
        {intro ? (
          <p
            className="mt-5 leading-relaxed"
            style={{
              fontSize: "var(--text-body-lg)",
              color: dark ? "rgba(255,255,255,0.62)" : "var(--color-text-muted)",
              maxWidth: "60ch",
            }}
          >
            {intro}
          </p>
        ) : null}

        <ul className="mt-9 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span
                className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: dark ? "rgba(176,241,34,0.14)" : "rgba(29,75,54,0.10)",
                  color: dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)",
                }}
              >
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              <span
                className="text-[15px] leading-relaxed"
                style={{ color: dark ? "rgba(255,255,255,0.80)" : "var(--color-text-body)" }}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>

        {note ? (
          <p
            className="mt-8 text-sm leading-relaxed"
            style={{
              color: dark ? "rgba(255,255,255,0.55)" : "var(--color-text-muted)",
              maxWidth: "72ch",
              fontStyle: "italic",
            }}
          >
            {note}
          </p>
        ) : null}
      </div>
    </section>
  );
}

// ── Why choose (feature list, card grid) ─────────────────────────────

export function WhyChooseSection({
  eyebrow = "Why Global Health",
  title,
  items,
  theme = "light",
}: {
  eyebrow?: string;
  title: string;
  items: string[];
  theme?: Theme;
}) {
  const dark = isDark(theme);
  return (
    <section style={sectionStyle(theme)}>
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <Eyebrow theme={theme}>{eyebrow}</Eyebrow>
        <SectionTitle theme={theme}>{title}</SectionTitle>

        <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-[var(--radius-card)] p-5"
              style={{
                background: dark ? "rgba(255,255,255,0.03)" : "var(--color-background-page)",
                border: dark
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(29,75,54,0.12)",
                boxShadow: dark ? "none" : "0 1px 12px rgba(29,75,54,0.05)",
              }}
            >
              <span
                className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "var(--color-brand-accent)",
                  color: "#0a1f14",
                }}
              >
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
              <span
                className="text-[15px] leading-relaxed"
                style={{ color: dark ? "rgba(255,255,255,0.82)" : "var(--color-text-body)" }}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Process steps (what happens during the consultation) ─────────────

export function ProcessStepsSection({
  eyebrow = "How it works",
  title,
  steps,
  theme = "light",
}: {
  eyebrow?: string;
  title: string;
  steps: Array<{ title: string; body: string }>;
  theme?: Theme;
}) {
  const dark = isDark(theme);
  return (
    <section style={sectionStyle(theme)}>
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <Eyebrow theme={theme}>{eyebrow}</Eyebrow>
        <SectionTitle theme={theme}>{title}</SectionTitle>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col rounded-[var(--radius-card)] p-6"
              style={{
                background: dark ? "rgba(255,255,255,0.03)" : "var(--color-background-page)",
                border: dark
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(29,75,54,0.12)",
                boxShadow: dark ? "none" : "0 1px 12px rgba(29,75,54,0.05)",
              }}
            >
              <span
                className="font-extrabold leading-none tracking-[-0.04em] [font-variant-numeric:tabular-nums]"
                style={{
                  fontSize: "clamp(2.5rem,4vw,3.5rem)",
                  color: dark ? "var(--color-brand-accent)" : "var(--color-brand-primary)",
                  opacity: 0.9,
                }}
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3
                className="mt-5 font-extrabold tracking-[-0.02em] leading-tight"
                style={{
                  fontSize: "clamp(1.1rem,1.5vw,1.3rem)",
                  color: dark ? "rgba(255,255,255,0.92)" : "var(--color-text-primary)",
                }}
              >
                {step.title}
              </h3>
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: dark ? "rgba(255,255,255,0.58)" : "var(--color-text-muted)" }}
              >
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── Important info (statutory / contextual highlight box) ────────────

export function ImportantInfoSection({
  eyebrow = "Good to know",
  title,
  paragraphs,
  theme = "soft",
}: {
  eyebrow?: string;
  title: string;
  paragraphs: string[];
  theme?: Theme;
}) {
  return (
    <section style={sectionStyle(theme)}>
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div
          className="rounded-[var(--radius-card)] p-6 sm:p-8 lg:p-10"
          style={{
            background: "rgba(176,241,34,0.07)",
            border: "1px solid rgba(29,75,54,0.18)",
          }}
        >
          <Eyebrow theme="soft">{eyebrow}</Eyebrow>
          <h2
            className="mt-3 font-extrabold tracking-[-0.02em] leading-tight"
            style={{
              fontSize: "clamp(1.4rem, 2vw + 0.5rem, 2rem)",
              color: "var(--color-text-primary)",
              maxWidth: "26ch",
            }}
          >
            {title}
          </h2>
          <div className="mt-5 space-y-4">
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-[15px] leading-relaxed"
                style={{ color: "var(--color-text-body)", maxWidth: "76ch" }}
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

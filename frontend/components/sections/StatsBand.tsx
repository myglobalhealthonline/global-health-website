/**
 * Stats band — clinical editorial version.
 * Asymmetric split: indexed eyebrow + headline left, four open
 * editorial stat columns right (2×2), each sitting on its own
 * hairline rule. No boxes — the rules carry the structure.
 */

import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export type StatBandItem = {
  value: string;
  label: string;
  caption?: string;
};

export type StatsBandI18n = {
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  body: string;
};

export function StatsBand({ items, theme = "dark", i18n }: { items: StatBandItem[]; theme?: "dark" | "light"; i18n?: StatsBandI18n }) {
  if (!items || items.length === 0) return null;

  const isLight = theme === "light";

  return (
    <section
      className={isLight ? "" : "relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark"}
      style={{
        // Warm off-white canvas on light; stat cards flip to white so they still read as cards.
        background: isLight ? "var(--color-background-soft)" : "var(--color-background-dark)",
        borderTop: isLight ? "1px solid rgba(29,75,54,0.10)" : "1px solid rgba(255,255,255,0.06)",
        borderBottom: isLight ? "1px solid rgba(29,75,54,0.10)" : "1px solid rgba(255,255,255,0.06)",
        padding: "clamp(64px,8vw,120px) 0",
      }}
    >
      <div
        className="mx-auto grid items-center gap-14 px-5 md:px-10 lg:grid-cols-[1fr_1.35fr] lg:gap-20"
        style={{ maxWidth: "var(--container-width)" }}
      >
        {/* Left — headline */}
        <RevealOnScroll delay={0}>
          <div className="lg:sticky lg:top-[calc(var(--header-height)+32px)]">
            <p className="flex items-center gap-3">
              <span
                className="text-[11px] font-bold tracking-[0.22em] uppercase"
                style={{ color: isLight ? "var(--color-brand-primary)" : "var(--color-brand-accent)" }}
              >
                {i18n?.eyebrow ?? "The platform"}
              </span>
            </p>
            <h2
              className="mt-5 font-extrabold leading-[1.0] tracking-[-0.035em]"
              style={{
                fontSize: "clamp(2.1rem, 4vw + 0.5rem, 3.6rem)",
                color: isLight ? "var(--color-text-primary)" : "rgba(255,255,255,0.95)",
                maxWidth: "16ch",
              }}
            >
              {i18n?.headline ?? "Built for people who shouldn't have to"}{" "}
              <span style={{ color: isLight ? "#8FB021" : "var(--color-brand-accent)" }}>
                {i18n?.headlineAccent ?? "wait"}
              </span>.
            </h2>
            <p
              className="mt-6 leading-relaxed"
              style={{
                fontSize: "var(--text-body-lg)",
                color: isLight ? "var(--color-text-muted)" : "rgba(255,255,255,0.50)",
                maxWidth: "38ch",
              }}
            >
              {i18n?.body ?? "Access licensed clinicians through open appointment slots, clear profiles, and service-specific booking steps."}
            </p>
          </div>
        </RevealOnScroll>

        {/* Right — open editorial stat columns */}
        <RevealOnScroll
          stagger
          delay={120}
          className="grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-2"
        >
          {items.slice(0, 4).map((it, i) => (
            <div
              key={`${it.label}-${it.value}`}
              className={`flex flex-col gap-3 rounded-2xl p-6 ${isLight ? "gh2-card-ivory" : ""}`}
              style={{
                background: isLight ? undefined : "rgba(255,255,255,0.05)",
                borderTop: `2px solid ${i === 0 ? (isLight ? "var(--color-brand-primary)" : "var(--color-brand-accent)") : "transparent"}`,
              }}
            >
              <dd
                className="font-extrabold leading-none tracking-[-0.045em] [font-variant-numeric:tabular-nums]"
                style={{
                  fontSize: "clamp(2.75rem,5.5vw,4.25rem)",
                  color: isLight ? "var(--color-brand-primary)" : "var(--color-brand-accent)",
                }}
              >
                {it.value}
              </dd>
              <dt
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: isLight ? "var(--color-text-primary)" : "rgba(255,255,255,0.60)" }}
              >
                {it.label}
              </dt>
              {it.caption ? (
                <p
                  className="text-sm leading-snug"
                  style={{
                    color: isLight ? "var(--color-text-muted)" : "rgba(255,255,255,0.32)",
                    maxWidth: "24ch",
                  }}
                >
                  {it.caption}
                </p>
              ) : null}
            </div>
          ))}
        </RevealOnScroll>
      </div>
    </section>
  );
}

/**
 * Stats band — clinical editorial version.
 * Asymmetric split: indexed eyebrow + headline left, four stat cards
 * right (2×2), each with an icon, large numeral, and label. Cards sit
 * on a warm ivory surface with subtle depth and consistent hairline rules.
 */

import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { SectionSeam } from "@/components/ui/SectionSeam";
import type { ReactNode } from "react";

export type StatBandItem = {
  value: string;
  label: string;
  caption?: string;
  icon?: ReactNode;
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
      className={
        isLight
          ? "relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel"
          : "relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"
      }
      style={{
        padding: "clamp(64px,8vw,120px) 0",
      }}
    >
      <SectionSeam />
      <div
        className="mx-auto grid items-center gap-14 px-5 md:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-20"
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

        {/* Right — stat cards (2×2) */}
        <RevealOnScroll
          stagger
          delay={120}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:[&>:last-child:nth-child(odd)]:col-span-2"
        >
          {items.slice(0, 4).map((it) => (
            <div
              key={`${it.label}-${it.value}`}
              className={`group relative m-0 flex flex-col gap-5 overflow-hidden rounded-2xl p-7 ${
                isLight ? "gh2-glass-forest gh2-glass-hover" : ""
              }`}
              style={
                isLight
                  ? undefined
                  : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }
              }
            >
              {/* Top accent hairline — lime over the dark card in both themes */}
              <div
                className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl opacity-100"
                style={{
                  background:
                    "linear-gradient(90deg, var(--color-brand-accent), rgba(176,241,34,0.2))",
                }}
              />

              {/* Icon */}
              {it.icon ? (
                <span
                  className="inline-flex size-11 items-center justify-center rounded-xl"
                  style={{
                    background: "rgba(176,241,34,0.08)",
                    border: "1px solid rgba(176,241,34,0.16)",
                    color: "var(--color-brand-accent)",
                  }}
                >
                  {it.icon}
                </span>
              ) : null}

              {/* Value — long values (registry numbers like "4687/2026") get a
                  smaller clamp and may wrap instead of escaping the card */}
              <p
                className="m-0 font-extrabold leading-none tracking-[-0.045em] [font-variant-numeric:tabular-nums] [overflow-wrap:anywhere]"
                style={{
                  fontSize:
                    it.value.length > 6
                      ? "clamp(1.9rem,4vw,3rem)"
                      : "clamp(2.75rem,5.5vw,4.25rem)",
                  color: "var(--color-brand-accent)",
                }}
              >
                {it.value}
              </p>

              {/* Label */}
              <p
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: isLight ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.60)" }}
              >
                {it.label}
              </p>

              {/* Caption */}
              {it.caption ? (
                <p
                  className="text-sm leading-snug"
                  style={{
                    color: isLight ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.32)",
                    maxWidth: "28ch",
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

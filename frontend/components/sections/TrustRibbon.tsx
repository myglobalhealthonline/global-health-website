/**
 * Trust ribbon — clinical editorial version.
 * Four credential columns separated by vertical hairlines, each with a
 * mono index, an icon tile, an oversized tabular value, and a caps
 * label. Light by default on the country homepage; dark variant kept
 * for legacy callers.
 */

import {
  ShieldCheck,
  Stethoscope,
  Globe2,
  Sparkles,
  Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export type TrustRibbonItem = {
  v: string;
  l: string;
  icon?: "shield" | "doctor" | "globe" | "lock" | "sparkles";
};

const ICONS: Record<NonNullable<TrustRibbonItem["icon"]>, LucideIcon> = {
  shield: ShieldCheck,
  doctor: Stethoscope,
  globe: Globe2,
  lock: Lock,
  sparkles: Sparkles,
};

function inferIcon(label: string): NonNullable<TrustRibbonItem["icon"]> {
  const n = label.toLowerCase();
  if (n.includes("doctor") || n.includes("clinician")) return "doctor";
  if (n.includes("countr") || n.includes("europ")) return "globe";
  if (n.includes("gdpr") || n.includes("complian")) return "lock";
  if (n.includes("secure") || n.includes("encrypt")) return "shield";
  return "sparkles";
}

const FALLBACK_ITEMS: TrustRibbonItem[] = [
  { v: "GDPR", l: "Compliant by default", icon: "lock" },
];

export function TrustRibbon({ items, theme = "light" }: { items?: TrustRibbonItem[]; theme?: "dark" | "light" }) {
  const list = items && items.length > 0 ? items : FALLBACK_ITEMS;
  const isLight = theme === "light";

  const hairline = isLight ? "rgba(29,75,54,0.12)" : "rgba(255,255,255,0.08)";

  return (
    <section
      className={isLight ? "relative overflow-hidden gh2-section-ivory gh-medical-pattern gh-medical-pattern-panel" : "relative overflow-hidden gh-medical-pattern gh-medical-pattern-dark gh2-section-forest"}
      style={{
        borderTop: isLight ? "2px solid rgba(176,241,34,0.24)" : undefined,
        borderBottom: `1px solid ${hairline}`,
        padding: "clamp(48px,6vw,88px) 0",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <RevealOnScroll
          stagger
          className={isLight ? "grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5" : "grid grid-cols-2 lg:grid-cols-4"}
        >
          {list.map((it, i) => {
            const Icon = ICONS[it.icon ?? inferIcon(it.l)];
            return (
              <div
                key={`${it.v}-${it.l}`}
                className={
                  isLight
                    ? // Light section → forest-glass tile matching the navbar chrome color.
                      "gh2-glass-forest gh2-glass-hover flex flex-col gap-5 rounded-2xl p-6 lg:p-7"
                    : `flex flex-col gap-5 px-1 pt-8 lg:px-8 lg:pt-10 ${
                        i % 2 === 1 ? "border-l pl-6" : ""
                      } ${i === 2 ? "lg:border-l" : ""}`
                }
                style={isLight ? undefined : { borderColor: hairline }}
                role="listitem"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex size-11 items-center justify-center rounded-xl"
                    style={{
                      background: "rgba(176,241,34,0.10)",
                      border: "1px solid rgba(176,241,34,0.18)",
                      color: "var(--color-brand-accent)",
                    }}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.6} aria-hidden />
                  </span>
                </div>
                <div>
                  <p
                    className="font-extrabold tracking-[-0.04em] leading-none [font-variant-numeric:tabular-nums]"
                    style={{
                      fontSize: "clamp(2rem,3.4vw,3rem)",
                      color: "var(--color-brand-accent)",
                    }}
                  >
                    {it.v}
                  </p>
                  <p
                    className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: isLight ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.42)" }}
                  >
                    {it.l}
                  </p>
                </div>
              </div>
            );
          })}
        </RevealOnScroll>
      </div>
    </section>
  );
}

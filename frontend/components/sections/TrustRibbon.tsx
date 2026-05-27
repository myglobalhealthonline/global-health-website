/**
 * Trust ribbon — dark luxury version.
 * Forest-night canvas, lime oversized values, white/40 labels,
 * lime icon circles.
 */

import {
  ShieldCheck,
  Stethoscope,
  Globe2,
  Sparkles,
  Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

export function TrustRibbon({ items, theme = "dark" }: { items?: TrustRibbonItem[]; theme?: "dark" | "light" }) {
  const list = items && items.length > 0 ? items : FALLBACK_ITEMS;
  const isLight = theme === "light";

  return (
    <section
      style={{
        background: isLight ? "var(--color-background-soft)" : "var(--color-background-dark)",
        borderBottom: isLight ? "1px solid rgba(29,75,54,0.10)" : "1px solid rgba(255,255,255,0.06)",
        padding: "clamp(48px,6vw,80px) 0",
      }}
    >
      <div
        className="mx-auto max-w-[var(--container-width)] px-5 md:px-10"
      >
        <ul
          className="grid gap-y-10 gap-x-6 grid-cols-2 lg:grid-cols-4"
          style={{
            borderTop: isLight ? "1px solid rgba(29,75,54,0.10)" : "1px solid rgba(255,255,255,0.07)",
            paddingTop: "clamp(40px,5vw,56px)",
          }}
        >
          {list.map((it, i) => {
            const Icon = ICONS[it.icon ?? inferIcon(it.l)];
            return (
              <li
                key={`${it.v}-${it.l}`}
                className={`flex flex-col gap-3 ${i > 0 ? "lg:pl-6" : ""}`}
              >
                <span
                  className="inline-flex size-10 items-center justify-center rounded-full"
                  style={{
                    background: isLight ? "rgba(29,75,54,0.08)" : "rgba(176,241,34,0.10)",
                    border: isLight ? "1px solid rgba(29,75,54,0.20)" : "1px solid rgba(176,241,34,0.18)",
                    color: isLight ? "var(--color-brand-primary)" : "var(--color-brand-accent)",
                  }}
                >
                  <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                </span>
                <p
                  className="font-extrabold tracking-[-0.04em] leading-none [font-variant-numeric:tabular-nums]"
                  style={{
                    fontSize: "clamp(1.75rem,3vw,2.5rem)",
                    color: isLight ? "var(--color-brand-primary)" : "var(--color-brand-accent)",
                  }}
                >
                  {it.v}
                </p>
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: isLight ? "var(--color-text-muted)" : "rgba(255,255,255,0.42)" }}
                >
                  {it.l}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

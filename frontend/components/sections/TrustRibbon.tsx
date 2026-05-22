/**
 * Trust ribbon — light luxury version.
 * White surface, forest icon circles, brand-primary values, muted labels.
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
  const normalised = label.toLowerCase();
  if (normalised.includes("doctor") || normalised.includes("clinician"))
    return "doctor";
  if (normalised.includes("countr") || normalised.includes("europ"))
    return "globe";
  if (normalised.includes("gdpr") || normalised.includes("complian"))
    return "lock";
  if (normalised.includes("secure") || normalised.includes("encrypt"))
    return "shield";
  return "sparkles";
}

const FALLBACK_ITEMS: TrustRibbonItem[] = [
  { v: "GDPR", l: "Compliant by default", icon: "lock" },
];

export function TrustRibbon({ items }: { items?: TrustRibbonItem[] }) {
  const list = items && items.length > 0 ? items : FALLBACK_ITEMS;
  return (
    <section
      className="relative bg-[var(--color-background-page)]"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <div
        className="mx-auto max-w-[var(--container-width)] px-5 md:px-10"
        style={{ padding: "clamp(40px,5vw,64px) clamp(20px,4vw,40px)" }}
      >
        <ul
          className="grid gap-y-10 gap-x-6 grid-cols-2 lg:grid-cols-4"
          style={{
            borderTop: "1px solid var(--color-border)",
            paddingTop: "clamp(40px,5vw,56px)",
          }}
        >
          {list.map((it, i) => {
            const Icon = ICONS[it.icon ?? inferIcon(it.l)];
            return (
              <li
                key={`${it.v}-${it.l}`}
                className={i > 0 ? "lg:pl-6 flex flex-col gap-3" : "flex flex-col gap-3"}
              >
                <span
                  className="inline-flex size-10 items-center justify-center rounded-full"
                  style={{
                    background: "var(--color-background-soft)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <Icon
                    className="size-4 text-[var(--color-brand-primary)]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>
                <p
                  className="font-extrabold tracking-[-0.03em] leading-none [font-variant-numeric:tabular-nums]"
                  style={{
                    fontSize: "clamp(1.75rem,3vw,2.5rem)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {it.v}
                </p>
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "var(--color-text-muted)" }}
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

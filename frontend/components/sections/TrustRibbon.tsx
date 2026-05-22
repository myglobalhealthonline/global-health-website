/**
 * Editorial trust ribbon — four-up proof points on a mint-cream surface
 * with subtle vertical hairlines. Each item carries an icon, a big
 * value, and a one-line caption. Stops being a flat row of stats and
 * starts reading as a credentials line.
 *
 * Data-driven. Caller passes the live counts; an icon mapper picks the
 * right Lucide icon per item type so we don't have to hand-thread a
 * fifth prop everywhere.
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
  /** Optional icon key. Defaults to a sparkles icon when not set. */
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
      className="
        relative
        bg-[var(--color-background-soft)]
        border-y border-[var(--color-border)]
      "
    >
      <div
        className="
          mx-auto max-w-[var(--container-width)]
          px-5 md:px-10
          py-8 md:py-10
        "
      >
        <ul
          className="
            grid gap-y-8 gap-x-6
            grid-cols-2
            md:grid-cols-2
            lg:grid-cols-4
            divide-x-0
            lg:divide-x lg:divide-[var(--color-border)]
          "
        >
          {list.map((it, i) => {
            const Icon = ICONS[it.icon ?? inferIcon(it.l)];
            return (
              <li
                key={`${it.v}-${it.l}`}
                className={
                  i > 0
                    ? "lg:pl-6 flex flex-col gap-2"
                    : "flex flex-col gap-2"
                }
              >
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--color-background-page)] border border-[var(--color-border)]">
                  <Icon
                    className="size-4 text-[var(--color-brand-primary)]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </span>
                <p
                  className="
                    font-semibold tracking-[-0.02em]
                    text-[2rem] leading-none
                    text-[var(--color-text-primary)]
                  "
                >
                  {it.v}
                </p>
                <p className="text-[length:var(--text-meta)] text-[var(--color-text-muted)]">
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

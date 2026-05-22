/**
 * Edge-to-edge marquee — country names + flags + active-doctor counts
 * scroll horizontally on loop. Sits between the hero and the trust
 * ribbon as a thin kinetic divider that visualises the European footprint.
 *
 * Pure CSS animation, `prefers-reduced-motion` guard pauses it.
 */

import { Flag } from "@/components/ui/Flag";
import type { CountryCode } from "@/data/countries";

export type MarqueeCountry = {
  code: CountryCode | string;
  name: string;
  doctorCount: number;
};

export function CountryMarquee({ countries }: { countries: MarqueeCountry[] }) {
  if (!countries || countries.length === 0) return null;
  const items = [...countries, ...countries];

  return (
    <section
      aria-label="Countries we serve"
      className="
        relative overflow-hidden
        border-y border-[var(--color-border)]
        bg-[var(--color-background-soft)]
      "
    >
      {/* Edge fade masks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20"
        style={{
          background:
            "linear-gradient(90deg, var(--color-background-soft) 0%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20"
        style={{
          background:
            "linear-gradient(270deg, var(--color-background-soft) 0%, transparent 100%)",
        }}
      />

      <div className="gh-marquee py-5 md:py-6">
        <ul className="gh-marquee-track flex shrink-0 items-center gap-10 md:gap-14 whitespace-nowrap pr-10 md:pr-14">
          {items.map((c, i) => (
            <li
              key={`${c.code}-${i}`}
              className="inline-flex items-center gap-3"
            >
              <Flag code={c.code as string} size="md" />
              <span
                className="
                  font-semibold tracking-[-0.015em]
                  text-[clamp(0.95rem,1.5vw+0.4rem,1.25rem)]
                  text-[var(--color-text-primary)]
                "
              >
                {c.name}
              </span>
              <span
                className="
                  text-[length:var(--text-meta)] font-semibold
                  text-[var(--color-brand-primary)] [font-variant-numeric:tabular-nums]
                "
              >
                {c.doctorCount}
                <span className="ml-1 text-[length:var(--text-eyebrow)] uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                  {c.doctorCount === 1 ? "doctor" : "doctors"}
                </span>
              </span>
              <span
                aria-hidden
                className="inline-block size-1 rounded-full bg-[var(--color-border-strong)]"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

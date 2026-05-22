/**
 * Edge-to-edge marquee — country names + flags + active-doctor counts
 * scroll horizontally on loop. Dark luxury version: forest night surface,
 * lime doctor counts.
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
      className="relative overflow-hidden"
      style={{
        background: "var(--color-background-dark)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Edge fade masks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
        style={{
          background:
            "linear-gradient(90deg, var(--color-background-dark) 0%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
        style={{
          background:
            "linear-gradient(270deg, var(--color-background-dark) 0%, transparent 100%)",
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
                className="font-semibold tracking-[-0.015em]"
                style={{
                  fontSize: "clamp(0.95rem,1.5vw+0.4rem,1.25rem)",
                  color: "rgba(255,255,255,0.60)",
                }}
              >
                {c.name}
              </span>
              <span
                className="font-bold [font-variant-numeric:tabular-nums]"
                style={{
                  fontSize: "var(--text-meta)",
                  color: "var(--color-brand-accent)",
                }}
              >
                {c.doctorCount}
                <span
                  className="ml-1 uppercase tracking-[0.1em]"
                  style={{
                    fontSize: "var(--text-eyebrow)",
                    color: "rgba(255,255,255,0.28)",
                  }}
                >
                  {c.doctorCount === 1 ? "doctor" : "doctors"}
                </span>
              </span>
              <span
                aria-hidden
                className="inline-block size-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.12)" }}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * Edge-to-edge marquee — dark luxury version.
 * Forest-night canvas, lime doctor counts, white/60 country names.
 * Acts as a thin separator between hero and content sections.
 */

import { Flag } from "@/components/ui/Flag";
import type { CountryCode } from "@/data/countries";

export type MarqueeCountry = {
  code: CountryCode | string;
  name: string;
  doctorCount: number;
};

export function CountryMarquee({ countries }: { countries: MarqueeCountry[] }) {
  const active = countries?.filter((c) => c.doctorCount > 0) ?? [];
  if (active.length === 0) return null;
  const items = [...active, ...active];

  return (
    <section
      aria-label="Countries we serve"
      className="relative overflow-hidden"
      style={{
        background: "var(--color-background-dark)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
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

      <div className="gh-marquee py-4 md:py-5">
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
                  fontSize: "clamp(0.875rem,1.5vw+0.3rem,1.05rem)",
                  color: "rgba(255,255,255,0.65)",
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
                    color: "rgba(255,255,255,0.35)",
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

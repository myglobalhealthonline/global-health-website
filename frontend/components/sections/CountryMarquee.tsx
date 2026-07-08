/**
 * Edge-to-edge coverage marquee — editorial XL version.
 * Oversized country names in extrabold, lime doctor counts as
 * superscripts, medical-cross separators. The closing band of the
 * page's dark opening movement (hero → marquee → light sections).
 */

import { Flag } from "@/components/ui/Flag";
import { MarqueeTrack } from "@/components/sections/MarqueeTrack";
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
      className="relative overflow-hidden border-y border-[rgba(29,75,54,0.10)] bg-[var(--color-background-soft)]"
    >
      {/* Edge fade masks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 gh-marquee-fade-left"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 gh-marquee-fade-right"
      />

      <div className="gh-marquee py-6 md:py-7">
        <MarqueeTrack>
          {items.map((c, i) => (
            <li key={`${c.code}-${i}`} className="inline-flex items-baseline gap-4">
              <Flag code={c.code as string} size="lg" className="self-center" />
              <span
                className="font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)] text-[clamp(1.25rem,2.2vw+0.4rem,1.9rem)]"
              >
                {c.name}
              </span>
              <span
                className="gh2-index text-[var(--color-brand-primary)]"
              >
                {String(c.doctorCount).padStart(2, "0")}
                <span className="ml-1 text-[var(--color-text-muted)]">
                  {c.doctorCount === 1 ? "doctor" : "doctors"}
                </span>
              </span>
              <span
                aria-hidden
                className="ml-6 self-center text-[14px] font-light text-[rgba(29,75,54,0.30)]"
              >
                ✚
              </span>
            </li>
          ))}
        </MarqueeTrack>
      </div>
    </section>
  );
}

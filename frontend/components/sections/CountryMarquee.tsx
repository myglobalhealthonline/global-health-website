/**
 * Edge-to-edge marquee — country names + flags + active-doctor counts
 * scroll horizontally on loop. Sits between the hero and the trust
 * ribbon to break the section rhythm with kinetic motion that has an
 * actual purpose (visualising the European footprint).
 *
 * Pure CSS animation, `prefers-reduced-motion` guard pauses it. No
 * runtime motion library. Marquee content is duplicated inline so the
 * loop seamlessly wraps without snapping back.
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
  // Duplicate twice so the loop has enough content to never reveal a gap
  // at the boundary. Each `gh-marquee-track` div uses
  // animation-duration tied to track width; CSS handles the loop.
  const items = [...countries, ...countries];

  return (
    <section
      aria-label="Countries we serve"
      className="
        relative overflow-hidden
        border-y border-white/10
        bg-[var(--color-background-dark)]
        text-white
      "
    >
      {/* Edge fade masks — soft fade at left + right edges so the
        * scrolling text doesn't snap into existence. Two gradient
        * pseudo-overlays. */}
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

      <div className="gh-marquee py-7 md:py-9">
        <ul className="gh-marquee-track flex shrink-0 items-center gap-12 md:gap-16 whitespace-nowrap pr-12 md:pr-16">
          {items.map((c, i) => (
            <li
              key={`${c.code}-${i}`}
              className="inline-flex items-center gap-4"
            >
              <Flag code={c.code as string} size="lg" />
              <span
                className="
                  font-semibold tracking-[-0.02em]
                  text-[clamp(1.5rem,2.5vw+0.5rem,2.5rem)]
                  text-white/90
                "
              >
                {c.name}
              </span>
              <span
                className="
                  text-[length:var(--text-meta)] font-semibold
                  text-[var(--color-accent)] [font-variant-numeric:tabular-nums]
                "
              >
                {c.doctorCount}
                <span className="ml-1 uppercase tracking-[0.12em] text-white/40">
                  doctors
                </span>
              </span>
              <span
                aria-hidden
                className="inline-block size-1.5 rounded-full bg-white/30"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

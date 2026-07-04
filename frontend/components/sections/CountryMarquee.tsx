/**
 * Edge-to-edge coverage marquee — editorial XL version.
 * Oversized country names in extrabold, lime doctor counts as
 * superscripts, medical-cross separators. The closing band of the
 * page's dark opening movement (hero → marquee → light sections).
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
        background: "var(--color-background-soft)",
        borderTop: "1px solid rgba(29,75,54,0.10)",
        borderBottom: "1px solid rgba(29,75,54,0.10)",
      }}
    >
      {/* Edge fade masks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
        style={{
          background: "linear-gradient(90deg, var(--color-background-soft) 0%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
        style={{
          background: "linear-gradient(270deg, var(--color-background-soft) 0%, transparent 100%)",
        }}
      />

      <div className="gh-marquee py-6 md:py-7">
        <ul className="gh-marquee-track flex shrink-0 items-center gap-12 md:gap-16 whitespace-nowrap pr-12 md:pr-16">
          {items.map((c, i) => (
            <li key={`${c.code}-${i}`} className="inline-flex items-baseline gap-4">
              <Flag code={c.code as string} size="lg" className="self-center" />
              <span
                className="font-extrabold tracking-[-0.03em]"
                style={{
                  fontSize: "clamp(1.25rem, 2.2vw + 0.4rem, 1.9rem)",
                  color: "var(--color-text-primary)",
                }}
              >
                {c.name}
              </span>
              <span
                className="gh2-index"
                style={{ color: "var(--color-brand-primary)" }}
              >
                {String(c.doctorCount).padStart(2, "0")}
                <span className="ml-1" style={{ color: "var(--color-text-muted)" }}>
                  {c.doctorCount === 1 ? "doctor" : "doctors"}
                </span>
              </span>
              <span
                aria-hidden
                className="ml-6 self-center text-[14px] font-light"
                style={{ color: "rgba(29,75,54,0.30)" }}
              >
                ✚
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

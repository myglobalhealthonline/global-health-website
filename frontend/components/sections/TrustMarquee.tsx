/**
 * Edge-to-edge trust-stats marquee — replaces the cross-country coverage
 * marquee on country home pages. A visitor inside one market doesn't care
 * how many doctors Portugal has; they care whether THIS country's service
 * is credible and fast. Same editorial XL visual language as
 * CountryMarquee: extrabold values, muted labels, medical-cross separators.
 */

import {
  Languages,
  LockKeyhole,
  ShieldCheck,
  Star,
  Stethoscope,
  Zap,
} from "lucide-react";

const ICONS = {
  star: Star,
  doctor: Stethoscope,
  bolt: Zap,
  languages: Languages,
  shield: ShieldCheck,
  lock: LockKeyhole,
} as const;

export type TrustMarqueeItem = {
  icon: keyof typeof ICONS;
  /** Big extrabold part, e.g. "24", "4.9★", "IMC" */
  value: string;
  /** Muted trailing part, e.g. "registered doctors" */
  label: string;
};

export function TrustMarquee({ items }: { items: TrustMarqueeItem[] }) {
  if (!items || items.length === 0) return null;
  // Duplicate the sequence so the CSS track loops seamlessly; short lists
  // get quadrupled so the belt never shows a gap on ultra-wide screens.
  const loop = items.length < 5 ? [...items, ...items] : items;
  const track = [...loop, ...loop];

  return (
    <section
      aria-label="Why patients trust us"
      className="gh2-section-forest relative overflow-hidden border-y border-white/[0.07]"
    >
      {/* Edge fade masks */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 gh-marquee-fade-left-dark"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 gh-marquee-fade-right-dark"
      />

      <div className="gh-marquee py-6 md:py-7">
        <ul className="gh-marquee-track flex shrink-0 items-center gap-12 md:gap-16 whitespace-nowrap pr-12 md:pr-16">
          {track.map((item, i) => {
            const Icon = ICONS[item.icon];
            return (
              <li key={i} className="inline-flex items-baseline gap-4">
                <Icon
                  aria-hidden
                  strokeWidth={1.8}
                  className="size-6 self-center text-[var(--color-brand-accent)] md:size-7"
                />
                <span
                  className="font-extrabold tracking-[-0.03em] text-[var(--color-brand-accent)] text-[clamp(1.25rem,2.2vw+0.4rem,1.9rem)]"
                >
                  {item.value}
                </span>
                <span
                  className="gh2-index text-white/[0.72]"
                >
                  {item.label}
                </span>
                <span
                  aria-hidden
                  className="ml-6 self-center text-[14px] font-light text-white/[0.22]"
                >
                  ✚
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

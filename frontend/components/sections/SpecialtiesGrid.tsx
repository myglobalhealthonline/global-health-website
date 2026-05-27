/**
 * Specialties grid — dark luxury version.
 * Forest-night canvas, lime eyebrow, white headline.
 */

import { ServiceCard } from "@/components/cards/ServiceCard";

type Item = {
  title: string;
  description: string;
  href: string;
  serviceType?: "general" | "specialist";
  audience?: string;
  duration?: string;
  startingPrice?: string;
};

type SpecialtiesGridProps = {
  title?: string;
  items: Item[];
};

export function SpecialtiesGrid({ title = "See a Specialist", items }: SpecialtiesGridProps) {
  return (
    <section
      style={{
        background: "var(--color-background-dark)",
        padding: "clamp(64px,8vw,120px) 0",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="mb-10 lg:mb-14">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: "var(--color-brand-accent)" }}
          >
            Specialist areas
          </span>
          <h2
            className="mt-4 font-extrabold tracking-[-0.03em] leading-[1.02]"
            style={{
              fontSize: "clamp(2rem,4vw+0.5rem,3.5rem)",
              color: "rgba(255,255,255,0.95)",
              maxWidth: "22ch",
            }}
          >
            {title}
          </h2>
        </div>
        <div className="gh-card-grid">
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} ctaLabel="See specialty" dark />
          ))}
        </div>
      </div>
    </section>
  );
}

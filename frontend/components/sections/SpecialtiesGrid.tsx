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

export function SpecialtiesGrid({ title = "Specialist consultations", items }: SpecialtiesGridProps) {
  return (
    <section
      style={{
        background: "var(--color-background-page)",
        padding: "clamp(64px,8vw,120px) 0",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div className="mx-auto max-w-[var(--container-width)] px-5 md:px-10">
        <div className="mb-10 lg:mb-12">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "var(--color-brand-primary)" }}
          >
            Specialist areas
          </span>
          <h2
            className="mt-3 font-extrabold tracking-[-0.03em] leading-[1.05]"
            style={{
              fontSize: "clamp(1.85rem,3.5vw,3rem)",
              color: "var(--color-text-primary)",
            }}
          >
            {title}
          </h2>
        </div>
        <div className="gh-card-grid">
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} ctaLabel="See specialty" />
          ))}
        </div>
      </div>
    </section>
  );
}

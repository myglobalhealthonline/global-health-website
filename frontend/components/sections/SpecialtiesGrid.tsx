import { ServiceCard } from "@/components/cards/ServiceCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

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
    <Section className="bg-[var(--color-background-soft)]">
      <Container>
        <h2 className="gh-h2 text-[var(--color-text-primary)]">{title}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:gap-6">
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} ctaLabel="See specialty" />
          ))}
        </div>
      </Container>
    </Section>
  );
}

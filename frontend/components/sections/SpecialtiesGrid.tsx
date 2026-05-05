import { ServiceCard } from "@/components/cards/ServiceCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type Item = { title: string; description: string; href: string };

type SpecialtiesGridProps = {
  title?: string;
  items: Item[];
};

export function SpecialtiesGrid({ title = "Specialist consultations", items }: SpecialtiesGridProps) {
  return (
    <Section>
      <Container>
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} ctaLabel="See specialty" />
          ))}
        </div>
      </Container>
    </Section>
  );
}

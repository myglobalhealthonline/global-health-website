import Link from "next/link";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type Item = { title: string; description: string; href: string };

type ServicesGridProps = {
  title?: string;
  intro?: string;
  cta?: { label: string; href: string };
  items: Item[];
};

export function ServicesGrid({ title = "Services", intro, cta, items }: ServicesGridProps) {
  return (
    <Section>
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h2>
            {intro ? <p className="mt-3 text-base text-slate-600 sm:text-lg">{intro}</p> : null}
          </div>
          {cta ? (
            <Link
              href={cta.href}
              className="inline-flex min-h-11 items-center rounded-full border border-cyan-700 px-5 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-50"
            >
              {cta.label}
            </Link>
          ) : null}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ServiceCard key={item.href} {...item} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

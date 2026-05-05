import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type TrustSignalsProps = {
  items: string[];
};

export function TrustSignals({ items }: TrustSignalsProps) {
  return (
    <Section className="bg-slate-50">
      <Container>
        <h2 className="text-2xl font-semibold text-slate-900">Why patients choose us</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              {item}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

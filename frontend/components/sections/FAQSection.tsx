import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type FAQItem = { question: string; answer: string };

type FAQSectionProps = {
  title?: string;
  items: FAQItem[];
};

export function FAQSection({ title = "FAQs", items }: FAQSectionProps) {
  return (
    <Section>
      <Container>
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <details key={item.question} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer font-medium text-slate-900">{item.question}</summary>
              <p className="mt-3 text-sm text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}

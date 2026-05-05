import { ChevronDown } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type FAQItem = { question: string; answer: string };

type FAQSectionProps = {
  title?: string;
  items: FAQItem[];
};

export function FAQSection({ title = "FAQs", items }: FAQSectionProps) {
  return (
    <Section className="bg-[var(--color-brand-secondary)]">
      <Container>
        <div className="mx-auto max-w-3xl">
          <h2 className="gh-h2 text-[var(--color-text-primary)]">{title}</h2>
        </div>
        <div className="mx-auto mt-8 max-w-4xl space-y-4">
          {items.map((item) => (
            <details key={item.question} className="gh-card group p-5">
              <summary className="gh-h3 flex cursor-pointer list-none items-center justify-between gap-4 text-[var(--color-text-primary)]">
                <span>{item.question}</span>
                <ChevronDown className="size-5 shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="gh-body-sm mt-4 max-w-3xl text-[var(--color-text-muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}

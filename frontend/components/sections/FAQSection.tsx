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
    <Section className="bg-white">
      <Container>
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h2>
        </div>
        <div className="mx-auto mt-6 max-w-4xl space-y-3">
          {items.map((item) => (
            <details key={item.question} className="group rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
                <span>{item.question}</span>
                <ChevronDown className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}

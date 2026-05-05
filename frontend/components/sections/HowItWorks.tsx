import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type HowItWorksProps = {
  title?: string;
  steps: string[];
};

export function HowItWorks({ title = "How it works", steps }: HowItWorksProps) {
  return (
    <Section>
      <Container>
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step} className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-teal-700">Step {index + 1}</p>
              <p className="mt-2">{step}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

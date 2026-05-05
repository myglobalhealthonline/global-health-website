import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type HowItWorksStep =
  | string
  | {
      title: string;
      description: string;
      ctaLabel?: string;
      ctaHref?: string;
    };

type HowItWorksProps = {
  title?: string;
  subtitle?: string;
  steps: HowItWorksStep[];
};

export function HowItWorks({ title = "How it works", subtitle, steps }: HowItWorksProps) {
  return (
    <Section className="bg-slate-50">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
          {subtitle ? <p className="mt-3 text-base text-slate-600 sm:text-lg">{subtitle}</p> : null}
        </div>
        <ol className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => {
            const normalized =
              typeof step === "string"
                ? { title: `Step ${index + 1}`, description: step }
                : step;

            return (
              <li key={`${normalized.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="inline-flex size-9 items-center justify-center rounded-full bg-cyan-700 text-sm font-semibold text-white">
                  {index + 1}
                </p>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{normalized.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{normalized.description}</p>
                {normalized.ctaLabel && normalized.ctaHref ? (
                  <Link
                    href={normalized.ctaHref}
                    className="mt-4 inline-flex min-h-10 items-center rounded-full border border-cyan-700 px-4 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-50"
                  >
                    {normalized.ctaLabel}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Container>
    </Section>
  );
}

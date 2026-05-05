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
    <Section className="bg-[var(--color-brand-secondary)]">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="gh-h2 text-[var(--color-text-primary)]">{title}</h2>
          {subtitle ? <p className="gh-body-lg mt-3 text-[var(--color-text-muted)]">{subtitle}</p> : null}
        </div>
        <ol className="mx-auto mt-10 grid max-w-6xl gap-5 sm:grid-cols-2 lg:gap-6">
          {steps.map((step, index) => {
            const normalized =
              typeof step === "string"
                ? { title: `Step ${index + 1}`, description: step }
                : step;

            return (
              <li key={`${normalized.title}-${index}`} className="gh-card p-6">
                <p className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-sm font-semibold text-[var(--color-brand-secondary)]">
                  {index + 1}
                </p>
                <h3 className="gh-h3 mt-4 text-[var(--color-text-primary)]">{normalized.title}</h3>
                <p className="gh-body-sm mt-2 text-[var(--color-text-muted)]">{normalized.description}</p>
                {normalized.ctaLabel && normalized.ctaHref ? (
                  <Link href={normalized.ctaHref} className="gh-btn gh-btn-outline mt-4 min-h-10 px-4">
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

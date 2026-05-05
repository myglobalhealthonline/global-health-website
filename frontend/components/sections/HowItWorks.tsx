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
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-3 text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">{subtitle}</p> : null}
        </div>
        <ol className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, index) => {
            const normalized =
              typeof step === "string"
                ? { title: `Step ${index + 1}`, description: step }
                : step;

            return (
              <li key={`${normalized.title}-${index}`} className="rounded-[24px] bg-[var(--color-background-soft)] p-6 shadow-[var(--shadow-card)]">
                <p className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-sm font-semibold text-[var(--color-brand-secondary)]">
                  {index + 1}
                </p>
                <h3 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">{normalized.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{normalized.description}</p>
                {normalized.ctaLabel && normalized.ctaHref ? (
                  <Link
                    href={normalized.ctaHref}
                    className="mt-4 inline-flex min-h-10 items-center rounded-full border border-[var(--color-brand-primary)] bg-[var(--color-brand-secondary)] px-4 text-sm font-semibold text-[var(--color-brand-primary)] transition-colors hover:bg-[var(--color-background-panel)]"
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

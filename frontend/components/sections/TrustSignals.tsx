import { ShieldCheck, Star, Timer, Users } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type TrustSignal =
  | string
  | {
      title: string;
      description?: string;
    };

type TrustSignalsProps = {
  title?: string;
  subtitle?: string;
  items: TrustSignal[];
};

const icons = [Star, ShieldCheck, Timer, Users];

export function TrustSignals({ title = "Why patients choose us", subtitle, items }: TrustSignalsProps) {
  return (
    <Section className="bg-[var(--color-background-page)]">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="gh-h2 text-[var(--color-text-primary)]">{title}</h2>
          {subtitle ? <p className="gh-body-lg mt-3 text-[var(--color-text-muted)]">{subtitle}</p> : null}
        </div>
        <ul className="mx-auto mt-10 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {items.map((item, index) => {
            const normalized = typeof item === "string" ? { title: item } : item;
            const Icon = icons[index % icons.length];

            return (
              <li
                key={`${normalized.title}-${index}`}
                className="gh-card p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <p className="gh-h3 mt-4 text-[var(--color-text-primary)]">{normalized.title}</p>
                {normalized.description ? <p className="gh-body-sm mt-2 text-[var(--color-text-muted)]">{normalized.description}</p> : null}
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

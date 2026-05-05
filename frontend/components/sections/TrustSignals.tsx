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
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">{title}</h2>
          {subtitle ? <p className="mt-3 text-base leading-7 text-[var(--color-text-muted)] sm:text-lg">{subtitle}</p> : null}
        </div>
        <ul className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, index) => {
            const normalized = typeof item === "string" ? { title: item } : item;
            const Icon = icons[index % icons.length];

            return (
              <li
                key={`${normalized.title}-${index}`}
                className="rounded-[24px] bg-[var(--color-brand-secondary)] p-6 shadow-[var(--shadow-card)]"
              >
                <span className="flex size-11 items-center justify-center rounded-[18px] bg-[var(--color-background-soft)] text-[var(--color-brand-primary)]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <p className="mt-4 text-base font-semibold text-[var(--color-text-primary)]">{normalized.title}</p>
                {normalized.description ? <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{normalized.description}</p> : null}
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

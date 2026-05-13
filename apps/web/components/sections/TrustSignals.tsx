import { ShieldCheck, Star, Timer, Users } from "lucide-react";
import { Container } from "@/components/layout/Container";

type TrustSignal =
  | string
  | {
      title: string;
      description?: string;
      image?: { src: string; alt: string };
    };

type TrustSignalsProps = {
  title?: string;
  subtitle?: string;
  items: TrustSignal[];
};

const icons = [Star, ShieldCheck, Timer, Users];

export function TrustSignals({ title = "Why patients choose us", subtitle, items }: TrustSignalsProps) {
  return (
    <section className="gh-medical-pattern gh-medical-pattern-dark bg-[var(--color-brand-primary)] py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center mb-12">
          <span className="gh-heading-eyebrow text-[var(--color-brand-accent)]">
            Why Us
          </span>
          <h2 className="gh-h2 mt-3 text-white">{title}</h2>
          {subtitle ? <p className="text-lg mt-3 text-white/85 max-w-2xl mx-auto leading-relaxed">{subtitle}</p> : null}
        </div>
        
        <ul className={`mx-auto max-w-6xl grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8 ${items.length >= 5 ? 'lg:grid-cols-3' : items.length === 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          {items.map((item, index) => {
            const normalized = typeof item === "string" ? { title: item } : item;
            const Icon = icons[index % icons.length];

            return (
              <li
                key={`${normalized.title}-${index}`}
                className="flex flex-col items-start"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-accent)]/20 text-[var(--color-brand-accent)]">
                  <Icon className="size-5" aria-hidden />
                </span>
                
                <p className="mt-4 text-lg font-bold text-white">
                  {normalized.title}
                </p>
                
                {normalized.description ? (
                  <p className="text-sm mt-2 text-white/80 leading-relaxed">
                    {normalized.description}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

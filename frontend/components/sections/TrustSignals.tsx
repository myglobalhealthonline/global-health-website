import Image from "next/image";
import { ShieldCheck, Star, Timer, Users } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";

type TrustSignal =
  | string
  | {
      title: string;
      description?: string;
      /** Approved CMS image (e.g. Railway /api/media URL). */
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
    <Section className="bg-[var(--color-background-page)]">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="gh-h2 text-[var(--color-text-primary)]">{title}</h2>
          {subtitle ? <p className="gh-body-lg mt-3 text-[var(--color-text-muted)]">{subtitle}</p> : null}
        </div>
        <ul className={`mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 ${items.length >= 5 ? 'lg:grid-cols-3' : items.length === 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          {items.map((item, index) => {
            const normalized = typeof item === "string" ? { title: item } : item;
            const Icon = icons[index % icons.length];

            return (
              <li key={`${normalized.title}-${index}`} className="gh-card p-6">
                {normalized.image ? (
                  <div className="relative mb-3 h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--color-background-soft)]">
                    <Image
                      src={normalized.image.src}
                      alt={normalized.image.alt}
                      fill
                      sizes="56px"
                      className="object-contain p-1"
                    />
                  </div>
                ) : (
                  <span className="gh-icon-circle">
                    <Icon className="size-5" aria-hidden />
                  </span>
                )}
                <p className="gh-h3 mt-4 text-[var(--color-text-primary)]">{normalized.title}</p>
                {normalized.description ? (
                  <p className="gh-body-sm mt-2 text-[var(--color-text-muted)]">
                    {normalized.description}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

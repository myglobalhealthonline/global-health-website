import { ArrowRight, Globe } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import type { CountryConfig } from "@/data/countries";

type CountrySelectorCopy = {
  title: string;
  description: string;
  enterClinic: string;
};

export function CountrySelector({
  countries,
  copy,
}: {
  countries: CountryConfig[];
  copy: CountrySelectorCopy;
}) {
  return (
    <Section
      id="countries"
      aria-labelledby="countries-heading"
      className="scroll-mt-24 bg-[var(--color-background-page)]"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="countries-heading" className="gh-h2 text-[var(--color-text-primary)]">
            {copy.title}
          </h2>
          <p className="gh-body-lg mt-4 text-[var(--color-text-muted)]">{copy.description}</p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {countries.map((country) => (
            <li key={country.code}>
              <Link
                href={country.legacyHomePath}
                className="gh-card gh-card-interactive group flex min-h-[160px] flex-col justify-between p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="gh-heading-eyebrow text-[var(--color-brand-primary)]">
                      Clinic location
                    </p>
                    <p className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">
                      {country.name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      Online consultations available
                    </p>
                  </div>
                  <span
                    className="gh-icon-circle shrink-0"
                    aria-hidden
                  >
                    <Globe className="size-5" />
                  </span>
                </div>
                <span className="gh-link-arrow mt-5">
                  {copy.enterClinic}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

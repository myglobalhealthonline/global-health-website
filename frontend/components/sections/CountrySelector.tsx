import { ArrowRight } from "lucide-react";
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
    <Section id="countries" aria-labelledby="countries-heading" className="scroll-mt-24 bg-white pt-8">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="countries-heading" className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">{copy.description}</p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((country) => (
            <li key={country.code}>
              <Link
                href={country.legacyHomePath}
                className="group flex min-h-[120px] flex-col justify-between rounded-2xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50/60 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-800">Medical Clinic</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{country.name}</p>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-full bg-cyan-700 text-xs font-bold text-white" aria-hidden>
                    {country.label}
                  </span>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700">
                  {copy.enterClinic}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}